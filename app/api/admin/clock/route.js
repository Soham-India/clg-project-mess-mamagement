import { NextResponse } from 'next/server';
import { getSettings, setSetting } from '@/lib/db';
import { handler, requireUser, bad } from '@/lib/auth';
import { ist, istToMs, mondayOf, addDays } from '@/lib/clock';
import { windowState } from '@/lib/couponRules';

// Demo clock: lets the admin "travel" to Saturday, a grace Monday, or lunch time,
// so every rule can be shown in a demo. Stored as an offset; the clock keeps ticking.

async function state() {
  const s = await getSettings();
  const now = Date.now() + s.clockOffsetMs;
  const p = ist(now);
  const win = windowState(now, s.prices, s.minDays);
  return {
    offsetMs: s.clockOffsetMs,
    active: s.clockOffsetMs !== 0,
    now,
    date: p.date,
    time: p.time,
    dayIndex: p.dayIndex,
    window: win.state,
    relaxedHours: s.relaxedHours,
    prices: s.prices,
    minDays: s.minDays,
  };
}

// GET /api/admin/clock
export const GET = handler(async (request) => {
  await requireUser(request, 'admin');
  return NextResponse.json(await state());
});

// PUT /api/admin/clock  { preset } | { date, time } | { relaxedHours }
export const PUT = handler(async (request) => {
  await requireUser(request, 'admin');
  const body = await request.json().catch(() => ({}));
  const today = ist(Date.now()).date;
  const monday = mondayOf(today);

  if (typeof body.relaxedHours === 'boolean') await setSetting('relaxed_hours', body.relaxedHours);

  let target = null;
  if (body.preset) {
    const presets = {
      saturday: [addDays(monday, 5), '11:00'], // window open, buying for next week
      grace: [addDays(monday, 7), '10:00'], // next Monday, breakfast locked
      lunch: [today, '12:30'],
      dinner: [today, '19:30'],
      closed: [addDays(monday, 2), '16:00'], // Wednesday afternoon
    };
    if (body.preset === 'real') target = 'real';
    else if (presets[body.preset]) target = istToMs(...presets[body.preset]);
    else throw bad('Unknown preset.');
  } else if (body.date && body.time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !/^\d{2}:\d{2}$/.test(body.time)) throw bad('Use a valid date and time.');
    target = istToMs(body.date, body.time);
  }

  if (target === 'real') await setSetting('clock_offset_ms', 0);
  else if (target !== null) await setSetting('clock_offset_ms', target - Date.now());

  return NextResponse.json(await state());
});
