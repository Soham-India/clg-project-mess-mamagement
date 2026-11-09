import { NextResponse } from 'next/server';
import { getDb, one, nowMs } from '@/lib/db';
import { handler, requireUser, HttpError, bad } from '@/lib/auth';
import { isSlotStarted } from '@/lib/couponRules';
import { mealLabel } from '@/lib/constants';

// POST /api/coupons/:id/transfer  { rollNo }
// Give an unused coupon to another student in the SAME mess unit.
export const POST = handler(async (request, { params }) => {
  const user = await requireUser(request, 'student');
  const { id } = await params;
  const { rollNo } = await request.json().catch(() => ({}));
  if (!rollNo) throw bad('Enter the roll number of the student you are giving the coupon to.');

  const coupon = await one('SELECT * FROM coupons WHERE id = ? AND student_id = ?', [Number(id), user.id]);
  if (!coupon) throw new HttpError(404, 'Coupon not found in your wallet.');
  if (coupon.status !== 'unused') throw bad('This coupon has already been used.');
  if (isSlotStarted(coupon.date, coupon.meal, await nowMs())) throw bad('This meal has already started, so the coupon can no longer be transferred.');

  const to = await one("SELECT * FROM users WHERE roll_no = ? AND role = 'student'", [String(rollNo).trim()]);
  if (!to) throw bad(`No student with roll number ${rollNo}.`);
  if (to.id === user.id) throw bad('You cannot transfer a coupon to yourself.');
  if (to.mess_unit !== coupon.mess_unit) throw bad(`${to.name} eats at a different mess. Coupons can only be transferred within the same mess.`);

  const db = await getDb();
  const tx = await db.transaction('write');
  try {
    // Atomic: only moves the coupon if it is still ours and still unused.
    const res = await tx.execute({
      sql: "UPDATE coupons SET student_id = ? WHERE id = ? AND student_id = ? AND status = 'unused'",
      args: [to.id, coupon.id, user.id],
    });
    if (res.rowsAffected === 0) throw bad('This coupon is no longer available to transfer.');
    await tx.execute({
      sql: 'INSERT INTO transfers (coupon_id, from_id, to_id, at) VALUES (?,?,?,?)',
      args: [coupon.id, user.id, to.id, new Date().toISOString()],
    });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    if (String(err.message).includes('UNIQUE')) {
      throw bad(`${to.name} already has a ${mealLabel(coupon.meal).toLowerCase()} coupon for ${coupon.date}.`);
    }
    throw err;
  } finally {
    tx.close();
  }
  return NextResponse.json({ ok: true, to: { name: to.name, rollNo: to.roll_no } });
});
