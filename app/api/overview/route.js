import { NextResponse } from 'next/server';
import { all, nowMs } from '@/lib/db';
import { handler, requireUser } from '@/lib/auth';
import { headcount } from '@/lib/checkin';
import { ist } from '@/lib/clock';
import { MESS_UNITS } from '@/lib/constants';

// GET /api/overview -> one row per mess unit: students, today's meals, complaints by status.
// Used by the mess society dashboard.
export const GET = handler(async (request) => {
  await requireUser(request, 'society', 'admin');
  const today = ist(await nowMs()).date;
  const complaintRows = await all('SELECT mess_unit, status, COUNT(*) AS n FROM complaints GROUP BY mess_unit, status');
  const studentRows = await all("SELECT mess_unit, COUNT(*) AS n FROM users WHERE role = 'student' GROUP BY mess_unit");
  const units = [];
  for (const u of MESS_UNITS) {
    const complaints = { open: 0, in_progress: 0, escalated: 0, resolved: 0 };
    complaintRows.filter((r) => r.mess_unit === u.code).forEach((r) => { complaints[r.status] = Number(r.n); });
    units.push({
      code: u.code,
      name: u.name,
      plan: u.plan,
      students: Number(studentRows.find((r) => r.mess_unit === u.code)?.n ?? 0),
      today: await headcount(u.code, today),
      complaints,
    });
  }
  return NextResponse.json({ date: today, units });
});
