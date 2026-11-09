// Runs before every page load: sends logged-out visitors to /login and keeps
// each role inside its own area. The API routes do their own checks too.
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = 'campusbite_session';
const HOME = { student: '/home', staff: '/staff/screen', society: '/society', admin: '/admin/students' };

// Which roles may open which page prefixes. Pages not listed are open to every logged-in user.
const RULES = [
  ['/home', ['student']],
  ['/coupons', ['student']],
  ['/checkin', ['student']],
  ['/staff', ['staff']],
  ['/society', ['society']],
  ['/admin', ['admin']],
];

async function roleFrom(request) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'thali-dev-jwt-secret-change-me');
    const { payload } = await jwtVerify(token, secret);
    return payload.role;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const role = await roleFrom(request);

  if (pathname === '/login') {
    return role ? NextResponse.redirect(new URL(HOME[role], request.url)) : NextResponse.next();
  }
  if (!role) return NextResponse.redirect(new URL('/login', request.url));
  if (pathname === '/') return NextResponse.redirect(new URL(HOME[role], request.url));

  const rule = RULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (rule && !rule[1].includes(role)) return NextResponse.redirect(new URL(HOME[role], request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|icon.svg).*)'],
};
