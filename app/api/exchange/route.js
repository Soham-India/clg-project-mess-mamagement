import { NextResponse } from 'next/server';
import { all, one, run, getSettings, nowMs } from '@/lib/db';
import { handler, bad, HttpError } from '@/lib/auth';
import { ist, addDays } from '@/lib/clock';
import { isSlotStarted, slotKey } from '@/lib/couponRules';
import { MEALS, MEAL_KEYS, mealLabel } from '@/lib/constants';
import { requireCouponStudent, shortName, bySlot, MAX_OPEN_REQUESTS, REQUEST_DAYS_AHEAD } from '@/lib/exchange';

// GET /api/exchange -> the exchange board of your mess:
//  forSale (others selling), wanted (others asking), mine (your posts), sellable (your coupons you
//  could put up), requestable (meals you could ask for).
export const GET = handler(async (request) => {
  const user = await requireCouponStudent(request);
  const now = await nowMs();
  const today = ist(now).date;
  const { prices } = await getSettings();
  const started = (x) => isSlotStarted(x.date, x.meal, now);

  const open = await all(
    `SELECT e.*, u.name AS poster_name FROM exchange_posts e JOIN users u ON u.id = e.student_id
      WHERE e.mess_unit = ? AND e.status = 'open' AND e.date >= ?`,
    [user.mess_unit, today],
  );
  // Coupons on sale must still belong to the seller and be unused (they may have checked in with it).
  const saleIds = open.filter((e) => e.kind === 'sell').map((e) => e.coupon_id);
  const saleCoupons = saleIds.length
    ? await all(`SELECT id, student_id, status FROM coupons WHERE id IN (${saleIds.map(() => '?').join(',')})`, saleIds)
    : [];
  const stillValid = (e) => saleCoupons.some((c) => c.id === e.coupon_id && c.student_id === e.student_id && c.status === 'unused');

  const myCoupons = await all('SELECT id, date, meal, price, status FROM coupons WHERE student_id = ? AND date >= ?', [user.id, today]);
  const held = new Set(myCoupons.map((c) => slotKey(c.date, c.meal)));
  const myUnused = myCoupons.filter((c) => c.status === 'unused' && !started(c));

  const forSale = open
    .filter((e) => e.kind === 'sell' && e.student_id !== user.id && !started(e) && stillValid(e))
    .map((e) => {
      const has = held.has(slotKey(e.date, e.meal));
      return { id: e.id, date: e.date, meal: e.meal, price: e.price, by: shortName(e.poster_name), canTake: !has, reason: has ? 'You already have this meal.' : null };
    })
    .sort(bySlot);

  const wanted = open
    .filter((e) => e.kind === 'request' && e.student_id !== user.id && !started(e))
    .map((e) => {
      const mine = myUnused.find((c) => c.date === e.date && c.meal === e.meal);
      return { id: e.id, date: e.date, meal: e.meal, price: e.price, by: shortName(e.poster_name), canTake: Boolean(mine), reason: mine ? null : "You don't have a coupon for this meal." };
    })
    .sort(bySlot);

  const myRows = await all(
    `SELECT e.*, t.name AS taker_name FROM exchange_posts e LEFT JOIN users t ON t.id = e.taker_id
      WHERE e.student_id = ? AND e.date >= ? ORDER BY e.date DESC, e.id DESC LIMIT 30`,
    [user.id, addDays(today, -7)],
  );
  const myCouponIds = new Set(myCoupons.filter((c) => c.status === 'unused').map((c) => c.id));
  const mine = myRows
    .map((e) => {
      let state = e.status; // open | done | cancelled
      if (state === 'open' && started(e)) state = 'expired';
      else if (state === 'open' && e.kind === 'sell' && !myCouponIds.has(e.coupon_id)) state = 'cancelled';
      return { id: e.id, kind: e.kind, date: e.date, meal: e.meal, price: e.price, state, with: e.taker_name ? shortName(e.taker_name) : null };
    });

  const onSale = new Set(open.filter((e) => e.kind === 'sell' && e.student_id === user.id).map((e) => e.coupon_id));
  const sellable = myUnused.filter((c) => !onSale.has(c.id)).map((c) => ({ id: c.id, date: c.date, meal: c.meal, price: c.price })).sort(bySlot);

  const asked = new Set(open.filter((e) => e.kind === 'request' && e.student_id === user.id).map((e) => slotKey(e.date, e.meal)));
  const requestable = [];
  for (let d = 0; d <= REQUEST_DAYS_AHEAD; d++) {
    const date = addDays(today, d);
    for (const m of MEALS) {
      const k = slotKey(date, m.key);
      if (!held.has(k) && !asked.has(k) && !isSlotStarted(date, m.key, now)) requestable.push({ date, meal: m.key, price: prices[m.key] });
    }
  }

  return NextResponse.json({ now, today, forSale, wanted, mine, sellable, requestable });
});

// POST /api/exchange  { kind: 'sell', couponId }  or  { kind: 'request', date, meal }
export const POST = handler(async (request) => {
  const user = await requireCouponStudent(request);
  const body = await request.json().catch(() => ({}));
  const now = await nowMs();
  const at = new Date(now).toISOString();

  if (body.kind === 'sell') {
    const c = await one('SELECT * FROM coupons WHERE id = ? AND student_id = ?', [Number(body.couponId), user.id]);
    if (!c) throw new HttpError(404, 'Coupon not found in your wallet.');
    if (c.status !== 'unused') throw bad('This coupon has already been used.');
    if (isSlotStarted(c.date, c.meal, now)) throw bad('This meal has already started, so the coupon can no longer be sold.');
    // An old post for this coupon by someone who no longer owns it is out of date: close it.
    await run("UPDATE exchange_posts SET status = 'cancelled', closed_at = ? WHERE kind = 'sell' AND status = 'open' AND coupon_id = ? AND student_id <> ?", [at, c.id, user.id]);
    try {
      await run(
        `INSERT INTO exchange_posts (kind, student_id, mess_unit, date, meal, coupon_id, price, created_at) VALUES ('sell',?,?,?,?,?,?,?)`,
        [user.id, c.mess_unit, c.date, c.meal, c.id, c.price, at],
      );
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) throw bad('This coupon is already on sale.');
      throw err;
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (body.kind === 'request') {
    const { date, meal } = body;
    const today = ist(now).date;
    if (!MEAL_KEYS.includes(meal)) throw bad('Pick a meal.');
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw bad('Pick a date.');
    if (date > addDays(today, REQUEST_DAYS_AHEAD)) throw bad(`You can ask for meals up to ${REQUEST_DAYS_AHEAD} days ahead.`);
    if (isSlotStarted(date, meal, now)) throw bad('This meal has already started. Pick a later one.');
    if (await one('SELECT id FROM coupons WHERE student_id = ? AND date = ? AND meal = ?', [user.id, date, meal])) {
      throw bad(`You already have a ${mealLabel(meal).toLowerCase()} coupon for that day.`);
    }
    const count = await one("SELECT COUNT(*) AS n FROM exchange_posts WHERE kind = 'request' AND status = 'open' AND student_id = ? AND date >= ?", [user.id, today]);
    if (Number(count.n) >= MAX_OPEN_REQUESTS) throw bad(`You can have at most ${MAX_OPEN_REQUESTS} open requests. Cancel one first.`);
    const { prices } = await getSettings();
    try {
      await run(
        `INSERT INTO exchange_posts (kind, student_id, mess_unit, date, meal, price, created_at) VALUES ('request',?,?,?,?,?,?)`,
        [user.id, user.mess_unit, date, meal, prices[meal], at],
      );
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) throw bad('You have already asked for this meal.');
      throw err;
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  throw bad('Choose to sell a coupon or ask for a meal.');
});
