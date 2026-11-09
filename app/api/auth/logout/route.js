import { NextResponse } from 'next/server';
import { COOKIE, cookieOptions } from '@/lib/auth';

// POST /api/auth/logout
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return res;
}
