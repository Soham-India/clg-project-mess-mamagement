import { NextResponse } from 'next/server';
import { one } from '@/lib/db';

// GET /api/health -> confirms the app and database are up.
export async function GET() {
  try {
    const { n } = await one('SELECT COUNT(*) AS n FROM users');
    return NextResponse.json({ ok: true, users: Number(n) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message) }, { status: 500 });
  }
}
