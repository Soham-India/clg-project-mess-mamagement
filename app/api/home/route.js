import { NextResponse } from 'next/server';
import { one, all, getSettings, nowMs } from '@/lib/db';
import { handler, requireUser } from '@/lib/auth';
import { ist, mondayOf } from '@/lib/clock';
import { currentMeal, nextMeal } from '@/lib/meals';
import { windowState, couponClockFor } from '@/lib/couponRules';
import { unitName } from '@/lib/constants';

// GET /api/home -> everything the student home page needs in one call.
export const GET = handler(async (request) => {
  const user = await requireUser(request, 'student');
  const now = await nowMs();
  const p = ist(now);
  const { prices, minDays } = await getSettings();

  const todayMenu = await all('SELECT meal, items FROM menu_items WHERE mess_unit = ? AND day = ?', [user.mess_unit, p.dayIndex]);
  const serving = currentMeal(now);
  const next = nextMeal(now);
  const myCheckins = await all('SELECT meal FROM checkins WHERE student_id = ? AND date = ?', [user.id, p.date]);

  let coupons = null;
  if (user.plan === 'coupon') {
    const win = windowState(couponClockFor(user, now), prices, minDays);
    const thisWeek = mondayOf(p.date);
    const today = await all('SELECT meal, status FROM coupons WHERE student_id = ? AND date = ?', [user.id, p.date]);
    const week = await one(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used FROM coupons WHERE student_id = ? AND date >= ? AND date <= date(?, '+6 days')",
      [user.id, thisWeek, thisWeek],
    );
    const nextOrder = await one('SELECT total FROM coupon_orders WHERE student_id = ? AND week_start = ?', [user.id, win.weekStart]);
    coupons = {
      window: { state: win.state, closesAt: win.closesAt ?? null, opensAt: win.opensAt ?? null, weekStart: win.weekStart },
      boughtForWindowWeek: nextOrder ? Number(nextOrder.total) : null,
      today,
      week: { total: Number(week.total || 0), used: Number(week.used || 0) },
    };
  }

  return NextResponse.json({
    now,
    date: p.date,
    dayIndex: p.dayIndex,
    messUnit: user.mess_unit,
    messUnitName: unitName(user.mess_unit),
    serving: serving ? { key: serving.key, label: serving.label, start: serving.start, end: serving.end } : null,
    next: { key: next.key, label: next.label, start: next.start, startsAt: next.startsAt, date: next.date },
    todayMenu: Object.fromEntries(todayMenu.map((r) => [r.meal, r.items])),
    checkedIn: myCheckins.map((r) => r.meal),
    coupons,
  });
});
