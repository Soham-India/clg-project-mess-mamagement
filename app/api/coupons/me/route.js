import { NextResponse } from 'next/server';
import { all, getSettings, nowMs } from '@/lib/db';
import { handler, requireUser, HttpError } from '@/lib/auth';
import { ist, mondayOf, addDays } from '@/lib/clock';
import { isSlotPast, isSlotStarted } from '@/lib/couponRules';

// GET /api/coupons/me?week=YYYY-MM-DD -> the student's coupons for a week (default: this week),
// each with a display status, plus their transfer history.
export const GET = handler(async (request) => {
  const user = await requireUser(request, 'student');
  if (user.plan !== 'coupon') throw new HttpError(403, 'Coupons are only for students on the coupon plan.');
  const now = await nowMs();
  const p = ist(now);
  const thisWeek = mondayOf(p.date);
  const asked = request.nextUrl.searchParams.get('week');
  const week = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? mondayOf(asked) : thisWeek;

  const rows = await all(
    `SELECT c.id, c.date, c.meal, c.price, c.status, c.used_at, c.original_student_id, o.name AS from_name
       FROM coupons c LEFT JOIN users o ON o.id = c.original_student_id
      WHERE c.student_id = ? AND c.date >= ? AND c.date <= date(?, '+6 days')
      ORDER BY c.date, CASE c.meal WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 ELSE 3 END`,
    [user.id, week, week],
  );
  const onSale = new Set(
    (await all("SELECT coupon_id FROM exchange_posts WHERE kind = 'sell' AND status = 'open' AND student_id = ?", [user.id])).map((r) => r.coupon_id),
  );
  const lateFees = new Map(
    (await all('SELECT coupon_id, fee FROM late_purchases WHERE student_id = ?', [user.id])).map((r) => [r.coupon_id, Number(r.fee)]),
  );
  const coupons = rows.map((c) => {
    let state;
    if (c.status === 'used') state = 'used';
    else if (isSlotPast(c.date, c.meal, now)) state = 'expired';
    else state = 'upcoming';
    return {
      id: c.id,
      date: c.date,
      meal: c.meal,
      price: c.price,
      state,
      usedAt: c.used_at,
      receivedFrom: c.original_student_id !== user.id ? c.from_name : null,
      transferable: state === 'upcoming' && !isSlotStarted(c.date, c.meal, now),
      onSale: state === 'upcoming' && onSale.has(c.id),
      lateFee: lateFees.get(c.id) ?? 0,
    };
  });

  const transfers = await all(
    `SELECT t.at, c.date, c.meal, f.name AS from_name, f.roll_no AS from_roll, r.name AS to_name, r.roll_no AS to_roll,
            CASE WHEN t.from_id = ? THEN 'sent' ELSE 'received' END AS direction, e.price
       FROM transfers t JOIN coupons c ON c.id = t.coupon_id
       LEFT JOIN exchange_posts e ON e.coupon_id = t.coupon_id AND e.closed_at = t.at AND e.status = 'done'
       JOIN users f ON f.id = t.from_id JOIN users r ON r.id = t.to_id
      WHERE t.from_id = ? OR t.to_id = ? ORDER BY t.at DESC LIMIT 20`,
    [user.id, user.id, user.id],
  );

  return NextResponse.json({
    week,
    thisWeek,
    prevWeek: addDays(week, -7),
    nextWeek: addDays(week, 7),
    today: p.date,
    coupons,
    transfers,
    summary: {
      total: coupons.length,
      used: coupons.filter((c) => c.state === 'used').length,
      upcoming: coupons.filter((c) => c.state === 'upcoming').length,
      expired: coupons.filter((c) => c.state === 'expired').length,
      spent: coupons.reduce((s, c) => s + Number(c.price), 0),
    },
  });
});
