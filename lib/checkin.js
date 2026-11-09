// Check-in rules, shared by the student code check-in and the staff counter.
// Order of checks: right mess -> (coupon plan) has a coupon for this meal -> not already served.
import { all, one, run, getSettings } from './db.js';
import { ist } from './clock.js';
import { currentMeal, nearestMeal, nextMeal } from './meals.js';
import { unitName, mealLabel } from './constants.js';

const timeOf = (iso) => ist(Date.parse(iso)).time;

/** Which meal a check-in at `nowMs` counts for. */
export async function mealForCheckin(nowMs) {
  const { relaxedHours } = await getSettings();
  const meal = currentMeal(nowMs);
  if (meal) return { meal, relaxed: false };
  if (relaxedHours) return { meal: nearestMeal(nowMs), relaxed: true };
  return { meal: null, next: nextMeal(nowMs) };
}

/**
 * Try to check `student` in at mess `atUnit`. Returns a result object the UI shows as a card:
 * { result: 'ok' | 'wrong_mess' | 'no_coupon' | 'already' | 'no_meal', title, detail, ... }
 */
export async function checkIn({ student, atUnit, nowMs, method }) {
  const p = ist(nowMs);
  const slot = await mealForCheckin(nowMs);
  const who = { name: student.name, rollNo: student.roll_no, plan: student.plan };

  if (!slot.meal) {
    return {
      result: 'no_meal',
      title: 'No meal is being served now',
      detail: `Next: ${slot.next.label} at ${slot.next.start}.`,
      student: who,
    };
  }
  const meal = slot.meal.key;
  const base = { meal, mealLabel: slot.meal.label, date: p.date, student: who, relaxed: slot.relaxed };

  if (student.mess_unit !== atUnit) {
    return {
      ...base,
      result: 'wrong_mess',
      title: 'Wrong mess',
      detail: `${student.name} eats at ${unitName(student.mess_unit)}, not ${unitName(atUnit)}.`,
      correctMess: unitName(student.mess_unit),
    };
  }

  const nowIso = new Date(nowMs).toISOString();

  if (student.plan === 'coupon') {
    // Atomic: only one request can flip a coupon from unused to used.
    const res = await run(
      "UPDATE coupons SET status = 'used', used_at = ? WHERE student_id = ? AND date = ? AND meal = ? AND status = 'unused'",
      [nowIso, student.id, p.date, meal],
    );
    if (res.rowsAffected === 0) {
      const coupon = await one('SELECT status, used_at FROM coupons WHERE student_id = ? AND date = ? AND meal = ?', [student.id, p.date, meal]);
      if (coupon?.status === 'used') {
        return { ...base, result: 'already', title: 'Already served', detail: `Coupon for ${mealLabel(meal).toLowerCase()} was used at ${timeOf(coupon.used_at)}.` };
      }
      return { ...base, result: 'no_coupon', title: 'No coupon for this meal', detail: `${student.name} has no ${mealLabel(meal).toLowerCase()} coupon for today.` };
    }
  }

  try {
    await run('INSERT INTO checkins (student_id, mess_unit, date, meal, at, method) VALUES (?,?,?,?,?,?)', [student.id, atUnit, p.date, meal, nowIso, method]);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      const prev = await one('SELECT at FROM checkins WHERE student_id = ? AND date = ? AND meal = ?', [student.id, p.date, meal]);
      return { ...base, result: 'already', title: 'Already served', detail: `Checked in for ${mealLabel(meal).toLowerCase()} at ${timeOf(prev.at)}.` };
    }
    throw err;
  }

  return {
    ...base,
    result: 'ok',
    title: 'Enjoy your meal',
    detail: student.plan === 'coupon' ? `${mealLabel(meal)} coupon used.` : `${mealLabel(meal)}, fixed plan.`,
  };
}

/** Expected vs served for each meal of a date at a mess unit. */
export async function headcount(unit, date) {
  const unitRow = await one('SELECT plan FROM mess_units WHERE code = ?', [unit]);
  const served = await all('SELECT meal, COUNT(*) AS n FROM checkins WHERE mess_unit = ? AND date = ? GROUP BY meal', [unit, date]);
  const servedBy = Object.fromEntries(served.map((r) => [r.meal, Number(r.n)]));
  let expectedBy;
  if (unitRow.plan === 'coupon') {
    const rows = await all('SELECT meal, COUNT(*) AS n FROM coupons WHERE mess_unit = ? AND date = ? GROUP BY meal', [unit, date]);
    expectedBy = Object.fromEntries(rows.map((r) => [r.meal, Number(r.n)]));
  } else {
    const { n } = await one("SELECT COUNT(*) AS n FROM users WHERE role = 'student' AND mess_unit = ?", [unit]);
    expectedBy = { breakfast: Number(n), lunch: Number(n), dinner: Number(n) };
  }
  return ['breakfast', 'lunch', 'dinner'].map((meal) => ({
    meal,
    expected: expectedBy[meal] ?? 0,
    served: servedBy[meal] ?? 0,
  }));
}
