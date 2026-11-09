import { NextResponse } from 'next/server';
import { one, run } from '@/lib/db';
import { handler, requireUser, bad, HttpError } from '@/lib/auth';
import { planFor, messUnitFor } from '@/lib/messAllocation';
import { unitName } from '@/lib/constants';

// PATCH /api/admin/students/:id  { batch, gender, plan }
// The mess unit is never sent by the browser: the server recomputes it.
export const PATCH = handler(async (request, { params }) => {
  await requireUser(request, 'admin');
  const { id } = await params;
  const s = await one("SELECT * FROM users WHERE id = ? AND role = 'student'", [Number(id)]);
  if (!s) throw new HttpError(404, 'Student not found.');
  const body = await request.json().catch(() => ({}));
  const batch = body.batch !== undefined ? Number(body.batch) : s.batch;
  const gender = body.gender ?? s.gender;
  if (![1, 2, 3, 4].includes(batch)) throw bad('Batch must be 1 to 4.');
  if (!['M', 'F'].includes(gender)) throw bad('Gender must be M or F.');
  const plan = planFor(batch, body.plan ?? s.plan);
  const messUnit = messUnitFor({ batch, plan, gender });
  await run('UPDATE users SET batch = ?, gender = ?, plan = ?, mess_unit = ? WHERE id = ?', [batch, gender, plan, messUnit, s.id]);
  return NextResponse.json({
    ok: true,
    student: { id: s.id, batch, gender, plan, messUnit, messUnitName: unitName(messUnit) },
    note: body.plan === 'coupon' && plan === 'fixed' ? '1st and 2nd years can only be on the fixed plan.' : null,
  });
});
