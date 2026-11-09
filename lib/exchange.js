// Coupon exchange: students of the same coupon mess sell spare coupons, or ask for a meal they need.
// Rules (checked in app/api/exchange, never only in the browser):
//  - Only coupon-plan students, and only with students of their own mess.
//  - Price is always the coupon's own price (no profit, no bargaining).
//  - Everything must happen before the meal starts. An open post whose meal has started is expired:
//    the coupon simply goes unused (no refund), exactly like any unused coupon.
//  - The buyer must not already hold a coupon for that meal (UNIQUE(student_id, date, meal) on coupons).
//  - A trade moves the coupon with a conditional UPDATE inside a transaction, so two buyers can't
//    both get the same coupon, and a coupon used at check-in can't be sold.
import { getDb } from './db.js';
import { HttpError, requireUser } from './auth.js';
import { MEAL_KEYS } from './constants.js';

export const MAX_OPEN_REQUESTS = 6;
export const REQUEST_DAYS_AHEAD = 7;

/** "Vikram Rath" -> "Vikram R." (enough to recognise someone at the mess, without the full name). */
export const shortName = (name) => {
  const [first, ...rest] = String(name || '').split(' ');
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

/** Sort helper: by date, then breakfast, lunch, dinner. */
export const bySlot = (a, b) => a.date.localeCompare(b.date) || MEAL_KEYS.indexOf(a.meal) - MEAL_KEYS.indexOf(b.meal);

export const paymentRef = () => `PAY-${Date.now().toString(36).toUpperCase()}`;

export async function requireCouponStudent(request) {
  const user = await requireUser(request, 'student');
  if (user.plan !== 'coupon') throw new HttpError(403, 'The coupon exchange is only for students on the coupon plan.');
  return user;
}

/**
 * Move one coupon from `fromId` to `toId` and close the post, all in one transaction.
 * Returns false if the coupon or the post changed in the meantime (someone was faster).
 * Throws an Error containing 'UNIQUE' if the receiver already holds that meal.
 */
export async function trade({ post, couponId, fromId, toId, at }) {
  const ref = paymentRef();
  const db = await getDb();
  const tx = await db.transaction('write');
  try {
    const moved = await tx.execute({
      sql: "UPDATE coupons SET student_id = ? WHERE id = ? AND student_id = ? AND status = 'unused'",
      args: [toId, couponId, fromId],
    });
    if (moved.rowsAffected === 0) {
      await tx.rollback();
      return false;
    }
    const closed = await tx.execute({
      sql: "UPDATE exchange_posts SET status = 'done', taker_id = ?, coupon_id = ?, payment_ref = ?, closed_at = ? WHERE id = ? AND status = 'open'",
      args: [post.kind === 'sell' ? toId : fromId, couponId, ref, at, post.id],
    });
    if (closed.rowsAffected === 0) {
      await tx.rollback();
      return false;
    }
    await tx.execute({ sql: 'INSERT INTO transfers (coupon_id, from_id, to_id, at) VALUES (?,?,?,?)', args: [couponId, fromId, toId, at] });
    // Tidy up: the buyer no longer needs their own request for this meal, and the coupon is no longer on sale.
    await tx.execute({
      sql: "UPDATE exchange_posts SET status = 'cancelled', closed_at = ? WHERE kind = 'request' AND status = 'open' AND student_id = ? AND date = ? AND meal = ?",
      args: [at, toId, post.date, post.meal],
    });
    await tx.execute({
      sql: "UPDATE exchange_posts SET status = 'cancelled', closed_at = ? WHERE kind = 'sell' AND status = 'open' AND coupon_id = ? AND id <> ?",
      args: [at, couponId, post.id],
    });
    await tx.commit();
    return ref;
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

