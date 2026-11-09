import { NextResponse } from 'next/server';
import { one, all, getSettings, nowMs } from '@/lib/db';
import { handler, requireUser, HttpError } from '@/lib/auth';
import { windowState, couponClockFor } from '@/lib/couponRules';
import { addDays } from '@/lib/clock';

// GET /api/coupons/window -> the buying window (open / grace / closed), the week it is for,
// locked slots, prices, minimum, and this student's existing order and last week's picks.
export const GET = handler(async (request) => {
  const user = await requireUser(request, 'student');
  if (user.plan !== 'coupon') throw new HttpError(403, 'Coupons are only for students on the coupon plan.');
  const now = await nowMs();
  const { prices, minDays } = await getSettings();
  const win = windowState(couponClockFor(user, now), prices, minDays);

  const order = await one('SELECT id, total, created_at, payment_ref FROM coupon_orders WHERE student_id = ? AND week_start = ?', [user.id, win.weekStart]);
  const orderItems = order ? await all('SELECT date, meal FROM coupons WHERE order_id = ?', [order.id]) : [];

  // Last week's picks, shifted forward 7 days, for the "Copy last week" shortcut.
  const prevStart = addDays(win.weekStart, -7);
  const prev = await all(
    "SELECT date, meal FROM coupons WHERE original_student_id = ? AND date >= ? AND date <= date(?, '+6 days')",
    [user.id, prevStart, prevStart],
  );
  const lastWeek = prev.map((c) => ({ date: addDays(c.date, 7), meal: c.meal }));

  return NextResponse.json({ ...win, order: order ? { ...order, items: orderItems } : null, lastWeek });
});
