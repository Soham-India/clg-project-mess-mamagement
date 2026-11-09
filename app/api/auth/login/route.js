import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { one } from '@/lib/db';
import { handler, bad, HttpError, signSession, cookieOptions, COOKIE, publicUser } from '@/lib/auth';

// POST /api/auth/login  { identifier: email or roll number, password }
export const POST = handler(async (request) => {
  const { identifier, password } = await request.json().catch(() => ({}));
  if (!identifier || !password) throw bad('Enter your email or roll number and password.');
  const id = String(identifier).trim();
  const user = await one('SELECT * FROM users WHERE email = ? OR roll_no = ?', [id, id]);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    throw new HttpError(401, 'Wrong email/roll number or password.');
  }
  const res = NextResponse.json({ user: publicUser(user) });
  res.cookies.set(COOKIE, await signSession(user), cookieOptions);
  return res;
});
