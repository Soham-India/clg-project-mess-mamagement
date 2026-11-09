// The coupon rules of the IIIT-BH coupon mess, as pure functions.
// The API calls these to ENFORCE the rules; the planner page calls the same
// functions only to SHOW hints. A tampered request is still rejected by the API.
//
// Rules:
//  - Coupons are for one meal on one specific date (breakfast / lunch / dinner).
//  - Buying window: Saturday 00:00 – Sunday 23:59 IST, for the next Mon–Sun week.
//  - Grace: purchases are still accepted on Monday until dinner starts; Monday
//    meals that have already started are locked.
//  - Weekly minimum: coupons worth `minDays` full days (4 × ₹119 = ₹476), any mix.
//  - Unused coupons are not refunded.

import { MEALS, MEAL_KEYS } from './constants.js';
import { ist, istToMs, addDays, mondayOf, weekDates, toMinutes } from './clock.js';

export const dayPrice = (prices) => prices.breakfast + prices.lunch + prices.dinner;
export const minTotal = (prices, minDays) => dayPrice(prices) * minDays;
export const maxTotal = (prices) => dayPrice(prices) * 7;

export const slotKey = (date, meal) => `${date}|${meal}`;

/** Where we are in the weekly cycle at time `nowMs`. */
export function windowState(nowMs, prices, minDays) {
  const p = ist(nowMs);
  const dinnerStart = toMinutes(MEALS.find((m) => m.key === 'dinner').start);
  const base = { prices, minTotal: minTotal(prices, minDays), maxTotal: maxTotal(prices), minDays, now: nowMs };

  // Saturday or Sunday: the normal window, buying for next week.
  if (p.dow === 6 || p.dow === 0) {
    const sunday = p.dow === 6 ? addDays(p.date, 1) : p.date;
    const weekStart = addDays(sunday, 1);
    return {
      ...base,
      state: 'open',
      weekStart,
      dates: weekDates(weekStart),
      locked: [],
      closesAt: istToMs(sunday, '23:59') + 59_999,
      graceUntil: istToMs(weekStart, MEALS[2].start),
    };
  }

  // Monday before dinner: grace period for this week. Meals already started are locked.
  if (p.dow === 1 && p.minuteOfDay < dinnerStart) {
    const weekStart = p.date;
    const locked = MEALS.filter((m) => toMinutes(m.start) <= p.minuteOfDay).map((m) => slotKey(p.date, m.key));
    return {
      ...base,
      state: 'grace',
      weekStart,
      dates: weekDates(weekStart),
      locked,
      closesAt: istToMs(p.date, MEALS[2].start),
    };
  }

  // Any other time: closed until Saturday.
  const daysToSaturday = (6 - p.dow + 7) % 7;
  const nextSaturday = addDays(p.date, daysToSaturday);
  const nextWeekStart = addDays(nextSaturday, 2);
  return {
    ...base,
    state: 'closed',
    weekStart: nextWeekStart,
    currentWeekStart: mondayOf(p.date),
    dates: weekDates(nextWeekStart),
    locked: [],
    opensAt: istToMs(nextSaturday, '00:00'),
  };
}

/** Sum of a list of {date, meal} items. */
export const totalOf = (items, prices) => items.reduce((s, it) => s + (prices[it.meal] ?? 0), 0);

/**
 * Validate an order against the rules. Returns a list of error messages (empty = valid).
 * `alreadyOrdered` = whether this student already has an order for that week.
 */
export function validateOrder(items, win, { alreadyOrdered }) {
  const errors = [];
  if (win.state === 'closed') errors.push('The coupon window is closed. It opens on Saturday.');
  if (alreadyOrdered) errors.push('You have already bought coupons for this week.');
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Select at least one meal.');
    return errors;
  }
  const seen = new Set();
  for (const it of items) {
    if (!win.dates.includes(it.date)) errors.push(`${it.date} is not in the week you are buying for.`);
    if (!MEAL_KEYS.includes(it.meal)) errors.push(`Unknown meal "${it.meal}".`);
    const key = slotKey(it.date, it.meal);
    if (seen.has(key)) errors.push(`${it.meal} on ${it.date} is selected twice.`);
    seen.add(key);
    if (win.locked.includes(key)) errors.push(`${it.meal} on ${it.date} has already started and can't be bought.`);
  }
  const total = totalOf(items, win.prices);
  if (total < win.minTotal) {
    errors.push(`Minimum purchase is ₹${win.minTotal} (${win.minDays} days' worth). You are ₹${win.minTotal - total} short.`);
  }
  return [...new Set(errors)];
}

/** Friendly hint for the planner: what single meal would close the gap to the minimum? */
export function shortfallHint(total, win) {
  const gap = win.minTotal - total;
  if (gap <= 0) return null;
  if (total === 0) return `Pick at least ₹${win.minTotal} worth of meals (${win.minDays} days' worth, any mix).`;
  const p = win.prices;
  if (gap <= p.breakfast) return `₹${gap} short. Add one breakfast to reach the minimum.`;
  if (gap <= p.dinner) return `₹${gap} short. Add one dinner to reach the minimum.`;
  if (gap <= p.lunch) return `₹${gap} short. Add one lunch to reach the minimum.`;
  return `₹${gap} short of the ₹${win.minTotal} minimum.`;
}

/** Is a meal slot already over (so an unused coupon has expired)? */
export function isSlotPast(date, meal, nowMs) {
  const end = MEALS.find((m) => m.key === meal).end;
  return istToMs(date, end) < nowMs;
}

/** Has a meal slot started (so it can no longer be transferred)? */
export function isSlotStarted(date, meal, nowMs) {
  const start = MEALS.find((m) => m.key === meal).start;
  return istToMs(date, start) <= nowMs;
}
