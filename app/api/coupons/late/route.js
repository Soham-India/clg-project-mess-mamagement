import { NextResponse } from 'next/server';
import { all, getDb, getSettings, nowMs } from '@/lib/db';
import { handler, requireUser, HttpError, bad } from '@/lib/auth';
import { ist } from '@/lib/clock';
import { lateBuyOptions, lateBuyError } from '@/lib/couponRules';
import { LATE_FEE, LATE_CUTOFF_MIN, mealLabel } from '@/lib/constants';

async function couponStudent(request) {
  const user = await requireUser(request, 'student');
  if (user.plan !== 'coupon') throw new HttpError(403, 'Coupons are only for students on the coupon plan.');
  return user;
}

// GET /api/coupons/late -> today's three meals: price + late fee, the buy-by time, and whether
// you can still buy each one ('open'), already hold it ('held'), or it is too late ('closed').
export const GET = handler(async (request) => {
  const user = await couponStudent(request);
  const now = await nowMs();
  const { prices } = await getSettings();
  const today = ist(now).date;
  const held = new Set((await all('SELECT meal FROM coupons WHERE student_id = ? AND date = ?', [user.id, today])).map((r) => r.meal));
  const options = lateBuyOptions(now, prices).map((o) => ({ ...o, state: held.has(o.meal) ? 'held' : o.open ? 'open' : 'closed' }));
  return NextResponse.json({ now, today, fee: LATE_FEE, cutoffMin: LATE_CUTOFF_MIN, options });
});

// POST /api/coupons/late  { meal } -> buy one coupon for that meal TODAY at price + late fee.
// Allowed any day of the week, with or without a weekly order, until 1 hour before the meal.
export const POST = handler(async (request) => {
  const user = await couponStudent(request);
  const { meal } = await request.json().catch(() => ({}));
  const now = await nowMs();
  const today = ist(now).date;
  const why = lateBuyError(today, meal, now);
  if (why) throw bad(why);

  const { prices } = await getSettings();
  const price = prices[meal];
  const paymentRef = `PAY-${Date.now().toString(36).toUpperCase()}`;
  const at = new Date(now).toISOString();

  // One transaction: the coupon and its late-purchase record are saved together, or neither is.
  const db = await getDb();
  const tx = await db.transaction('write');
  try {
    const res = await tx.execute({
      sql: `INSERT INTO coupons (order_id, student_id, original_student_id, mess_unit, date, meal, price)
            VALUES (NULL,?,?,?,?,?,?)`,
      args: [user.id, user.id, user.mess_unit, today, meal, price],
    });
    await tx.execute({
      sql: `INSERT INTO late_purchases (student_id, coupon_id, date, meal, price, fee, payment_ref, created_at)
            VALUES (?,?,?,?,?,?,?,?)`,
      args: [user.id, Number(res.lastInsertRowid), today, meal, price, LATE_FEE, paymentRef, at],
    });
    // They no longer need to ask for this meal on the coupon exchange.
    await tx.execute({
      sql: "UPDATE exchange_posts SET status = 'cancelled', closed_at = ? WHERE kind = 'request' AND status = 'open' AND student_id = ? AND date = ? AND meal = ?",
      args: [at, user.id, today, meal],
    });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    if (String(err.message).includes('UNIQUE')) throw bad(`You already have a ${mealLabel(meal).toLowerCase()} coupon for today.`);
    throw err;
  } finally {
    tx.close();
  }
  return NextResponse.json(
    { ok: true, meal, price, fee: LATE_FEE, total: price + LATE_FEE, paymentRef, message: `${mealLabel(meal)} coupon for today bought for ₹${price + LATE_FEE}.` },
    { status: 201 },
  );
});
