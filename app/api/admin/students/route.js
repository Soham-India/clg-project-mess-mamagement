import { NextResponse } from 'next/server';
import { all } from '@/lib/db';
import { handler, requireUser } from '@/lib/auth';
import { unitName } from '@/lib/constants';

// GET /api/admin/students -> every student with batch, plan, gender and computed mess unit.
export const GET = handler(async (request) => {
  await requireUser(request, 'admin');
  const rows = await all(
    "SELECT id, name, email, roll_no, batch, gender, plan, mess_unit FROM users WHERE role = 'student' ORDER BY batch, roll_no",
  );
  const counts = await all("SELECT mess_unit, COUNT(*) AS n FROM users WHERE role = 'student' GROUP BY mess_unit");
  return NextResponse.json({
    students: rows.map((s) => ({
      id: s.id, name: s.name, email: s.email, rollNo: s.roll_no, batch: s.batch, gender: s.gender, plan: s.plan,
      messUnit: s.mess_unit, messUnitName: unitName(s.mess_unit),
    })),
    unitCounts: Object.fromEntries(counts.map((c) => [c.mess_unit, Number(c.n)])),
  });
});
