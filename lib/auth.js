// Authentication: a signed JWT stored in an httpOnly cookie (JavaScript in the
// browser can't read it, which protects it from XSS). Passwords are bcrypt-hashed.
import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { one } from './db.js';

export const COOKIE = 'thali_session';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'thali-dev-jwt-secret-change-me');

export async function signSession(user) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

/** The public shape of a user, as sent to the browser. */
export function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    rollNo: u.roll_no,
    role: u.role,
    batch: u.batch,
    gender: u.gender,
    plan: u.plan,
    messUnit: u.mess_unit,
  };
}

/** The logged-in user for this request, or null. */
export async function currentUser(request) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  return one('SELECT * FROM users WHERE id = ?', [Number(payload.sub)]);
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Throws 401 if not logged in, 403 if the role is not allowed. */
export async function requireUser(request, ...roles) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, 'Please log in.');
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'You do not have access to this.');
  return user;
}

/** Wraps a route handler: turns thrown errors into JSON responses { error }. */
export function handler(fn) {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (String(err?.message || '').includes('UNIQUE constraint failed')) {
        return NextResponse.json({ error: 'That already exists.' }, { status: 409 });
      }
      console.error(err);
      return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 });
    }
  };
}

export const bad = (message) => new HttpError(400, message);
