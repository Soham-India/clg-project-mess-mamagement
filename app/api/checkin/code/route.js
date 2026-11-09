import { NextResponse } from 'next/server';
import { all, nowMs } from '@/lib/db';
import { handler, requireUser } from '@/lib/auth';
import { codeFor, msUntilNextCode, CODE_WINDOW_MS } from '@/lib/checkinCode';
import { mealForCheckin, headcount } from '@/lib/checkin';
import { ist } from '@/lib/clock';
import { unitName } from '@/lib/constants';

// GET /api/checkin/code -> the current rotating code for the staff member's mess,
// the meal being served and the live served count. The staff screen polls this.
export const GET = handler(async (request) => {
  const staff = await requireUser(request, 'staff');
  const now = await nowMs();
  const p = ist(now);
  const slot = await mealForCheckin(now);
  const counts = await headcount(staff.mess_unit, p.date);
  const meal = slot.meal?.key;
  const recent = meal
    ? await all(
        `SELECT u.name, u.roll_no, c.at FROM checkins c JOIN users u ON u.id = c.student_id
          WHERE c.mess_unit = ? AND c.date = ? AND c.meal = ? ORDER BY c.at DESC LIMIT 6`,
        [staff.mess_unit, p.date, meal],
      )
    : [];
  return NextResponse.json({
    unit: staff.mess_unit,
    unitName: unitName(staff.mess_unit),
    code: codeFor(staff.mess_unit),
    msLeft: msUntilNextCode(),
    windowMs: CODE_WINDOW_MS,
    date: p.date,
    time: p.time,
    meal: slot.meal ? { key: slot.meal.key, label: slot.meal.label, start: slot.meal.start, end: slot.meal.end, relaxed: slot.relaxed } : null,
    next: slot.next ?? null,
    count: meal ? counts.find((c) => c.meal === meal) : null,
    recent: recent.map((r) => ({ name: r.name, rollNo: r.roll_no, time: ist(Date.parse(r.at)).time })),
  });
});
