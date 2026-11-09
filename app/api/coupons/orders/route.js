import { NextResponse } from 'next/server';
import { getDb, one, getSettings, nowMs } from '@/lib/db';
import { handler, requireUser, HttpError } from '@/lib/auth';
import { windowState, validateOrder, totalOf, couponClockFor } from '@/lib/couponRules';

// POST /api/coupons/orders  { items: [{ date, meal }] }
// Every rule is checked HERE on the server, whatever the browser says.
export const POST = handler(async (request) => {
  const user = await requireUser(request, 'student');
  if (user.plan !== 'coupon') throw new HttpError(403, 'Coupons are only for students on the coupon plan.');

  const { items } = await request.json().catch(() => ({}));
  const now = await nowMs();
  const { prices, minDays } = await getSettings();
  const win = windowState(couponClockFor(user, now), prices, minDays);
  const existing = await one('SELECT id FROM coupon_orders WHERE student_id = ? AND week_start = ?', [user.id, win.weekStart]);

  const errors = validateOrder(items, win, { alreadyOrdered: Boolean(existing) });
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const total = totalOf(items, prices);
  const paymentRef = `PAY-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = new Date(now).toISOString();

  // One transaction: the order and all its coupons are saved together, or nothing is.
  const db = await getDb();
  const tx = await db.transaction('write');
  try {
    const res = await tx.execute({
      sql: 'INSERT INTO coupon_orders (student_id, week_start, total, payment_ref, created_at) VALUES (?,?,?,?,?)',
      args: [user.id, win.weekStart, total, paymentRef, createdAt],
    });
    const orderId = Number(res.lastInsertRowid);
    for (const it of items) {
      await tx.execute({
        sql: `INSERT INTO coupons (order_id, student_id, original_student_id, mess_unit, date, meal, price)
              VALUES (?,?,?,?,?,?,?)`,
        args: [orderId, user.id, user.id, user.mess_unit, it.date, it.meal, prices[it.meal]],
      });
    }
    await tx.commit();
    return NextResponse.json({ ok: true, orderId, total, paymentRef, count: items.length, weekStart: win.weekStart }, { status: 201 });
  } catch (err) {
    await tx.rollback();
    if (String(err.message).includes('UNIQUE')) {
      throw new HttpError(409, 'You already hold a coupon for one of these meals (maybe one was transferred to you).');
    }
    throw err;
  } finally {
    tx.close();
  }
});
