import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { one, getDb } from '@/lib/db';
import { handler, bad, HttpError, signSession, cookieOptions, COOKIE, publicUser } from '@/lib/auth';
import { DEMO_BUYER_EMAIL } from '@/lib/couponRules';

// The demo buyer starts fresh at every login, so the purchase demo can be recorded again.
async function resetDemoBuyer(userId) {
  const db = await getDb();
  const tx = await db.transaction('write');
  try {
    const mine = 'SELECT id FROM coupons WHERE student_id = ? OR original_student_id = ?';
    await tx.execute({ sql: `DELETE FROM transfers WHERE coupon_id IN (${mine})`, args: [userId, userId] });
    await tx.execute({ sql: 'DELETE FROM coupons WHERE student_id = ? OR original_student_id = ?', args: [userId, userId] });
    await tx.execute({ sql: 'DELETE FROM coupon_orders WHERE student_id = ?', args: [userId] });
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

// POST /api/auth/login  { identifier: email or roll number, password }
export const POST = handler(async (request) => {
  const { identifier, password } = await request.json().catch(() => ({}));
  if (!identifier || !password) throw bad('Enter your email or roll number and password.');
  const id = String(identifier).trim();
  const user = await one('SELECT * FROM users WHERE email = ? OR roll_no = ?', [id, id]);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    throw new HttpError(401, 'Wrong email/roll number or password.');
  }
  if (String(user.email).toLowerCase() === DEMO_BUYER_EMAIL) await resetDemoBuyer(user.id);
  const res = NextResponse.json({ user: publicUser(user) });
  res.cookies.set(COOKIE, await signSession(user), cookieOptions);
  return res;
});
