import { MEALS } from './constants.js';
import { ist, istToMs, addDays, toMinutes } from './clock.js';

/** The meal being served right now, or null. */
export function currentMeal(nowMs) {
  const p = ist(nowMs);
  return MEALS.find((m) => p.minuteOfDay >= toMinutes(m.start) && p.minuteOfDay < toMinutes(m.end)) ?? null;
}

/** The meal nearest in time today (used in relaxed demo mode outside meal hours). */
export function nearestMeal(nowMs) {
  const p = ist(nowMs);
  const dist = (m) => Math.min(Math.abs(p.minuteOfDay - toMinutes(m.start)), Math.abs(p.minuteOfDay - toMinutes(m.end)));
  return [...MEALS].sort((a, b) => dist(a) - dist(b))[0];
}

/** The next meal to start after now, with its start time (ms). */
export function nextMeal(nowMs) {
  const p = ist(nowMs);
  const today = MEALS.find((m) => toMinutes(m.start) > p.minuteOfDay);
  if (today) return { ...today, date: p.date, startsAt: istToMs(p.date, today.start) };
  const tomorrow = addDays(p.date, 1);
  return { ...MEALS[0], date: tomorrow, startsAt: istToMs(tomorrow, MEALS[0].start) };
}
