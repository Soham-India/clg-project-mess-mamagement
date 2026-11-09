import { NextResponse } from 'next/server';
import { all, run, nowMs } from '@/lib/db';
import { handler, requireUser, bad } from '@/lib/auth';
import { MESS_UNITS, MEAL_KEYS } from '@/lib/constants';
import { ist } from '@/lib/clock';

// GET /api/menu?unit=CPN-B -> the weekly menu of a mess unit (default: your own).
export const GET = handler(async (request) => {
  const user = await requireUser(request);
  const asked = request.nextUrl.searchParams.get('unit');
  const unit = MESS_UNITS.some((u) => u.code === asked) ? asked : user.mess_unit || 'FY';
  const rows = await all('SELECT day, meal, items, updated_at FROM menu_items WHERE mess_unit = ? ORDER BY day', [unit]);
  const days = Array.from({ length: 7 }, (_, d) => {
    const byMeal = {};
    for (const r of rows.filter((x) => Number(x.day) === d)) byMeal[r.meal] = r.items;
    return byMeal;
  });
  const now = ist(await nowMs());
  return NextResponse.json({ unit, days, todayIndex: now.dayIndex, units: MESS_UNITS });
});

// PUT /api/menu  { day, meal, items } -> staff edit the menu of THEIR mess.
export const PUT = handler(async (request) => {
  const user = await requireUser(request, 'staff');
  const { day, meal, items } = await request.json().catch(() => ({}));
  const d = Number(day);
  if (!Number.isInteger(d) || d < 0 || d > 6) throw bad('Pick a day.');
  if (!MEAL_KEYS.includes(meal)) throw bad('Pick a meal.');
  const text = String(items || '').trim();
  if (text.length < 3) throw bad('Menu items are too short.');
  if (text.length > 200) throw bad('Keep the menu under 200 characters.');
  await run('UPDATE menu_items SET items = ?, updated_by = ?, updated_at = ? WHERE mess_unit = ? AND day = ? AND meal = ?', [
    text, user.id, new Date().toISOString(), user.mess_unit, d, meal,
  ]);
  return NextResponse.json({ ok: true });
});
