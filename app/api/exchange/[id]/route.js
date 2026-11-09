import { NextResponse } from 'next/server';
import { one, run, nowMs } from '@/lib/db';
import { handler, bad, HttpError } from '@/lib/auth';
import { isSlotStarted } from '@/lib/couponRules';
import { mealLabel } from '@/lib/constants';
import { requireCouponStudent, trade, shortName } from '@/lib/exchange';

async function openPost(id, user) {
  const post = await one(
    'SELECT e.*, u.name AS poster_name FROM exchange_posts e JOIN users u ON u.id = e.student_id WHERE e.id = ?',
    [Number(id)],
  );
  if (!post) throw new HttpError(404, 'This post no longer exists.');
  if (post.mess_unit !== user.mess_unit) throw new HttpError(403, 'This post is for another mess.');
  if (post.status !== 'open') throw bad(post.kind === 'sell' ? 'Someone else already bought this coupon.' : 'Someone else already gave this meal.');
  return post;
}

// POST /api/exchange/:id -> take a post.
//  sell post:    you BUY the coupon (you pay its price; demo payment).
//  request post: you SELL them your coupon for that meal (they pay you its price).
export const POST = handler(async (request, { params }) => {
  const user = await requireCouponStudent(request);
  const { id } = await params;
  const post = await openPost(id, user);
  if (post.student_id === user.id) throw bad('This is your own post.');
  const now = await nowMs();
  if (isSlotStarted(post.date, post.meal, now)) throw bad('This meal has already started, so the post has expired.');
  const at = new Date(now).toISOString();
  const meal = mealLabel(post.meal).toLowerCase();
  const other = shortName(post.poster_name);

  if (post.kind === 'sell') {
    if (await one('SELECT id FROM coupons WHERE student_id = ? AND date = ? AND meal = ?', [user.id, post.date, post.meal])) {
      throw bad(`You already have a ${meal} coupon for that day.`);
    }
    let ref;
    try {
      ref = await trade({ post, couponId: post.coupon_id, fromId: post.student_id, toId: user.id, at });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) throw bad(`You already have a ${meal} coupon for that day.`);
      throw err;
    }
    if (!ref) throw bad('This coupon is no longer available. Someone else may have bought it.');
    return NextResponse.json({ ok: true, message: `You bought ${other}'s ${meal} coupon for ₹${post.price}.`, paymentRef: ref });
  }

  // Request: give them one of my unused coupons for that meal.
  const mine = await one(
    "SELECT id FROM coupons WHERE student_id = ? AND date = ? AND meal = ? AND status = 'unused'",
    [user.id, post.date, post.meal],
  );
  if (!mine) throw bad(`You don't have an unused ${meal} coupon for that day.`);
  let ref;
  try {
    ref = await trade({ post, couponId: mine.id, fromId: user.id, toId: post.student_id, at });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      // They got this meal some other way, so their request is no longer needed.
      await run("UPDATE exchange_posts SET status = 'cancelled', closed_at = ? WHERE id = ? AND status = 'open'", [at, post.id]);
      throw bad(`${other} already has this meal now. Their request has been closed.`);
    }
    throw err;
  }
  if (!ref) throw bad('Someone else already gave this meal.');
  return NextResponse.json({ ok: true, message: `You sold your ${meal} coupon to ${other} for ₹${post.price}.`, paymentRef: ref });
});

// DELETE /api/exchange/:id -> cancel your own open post.
export const DELETE = handler(async (request, { params }) => {
  const user = await requireCouponStudent(request);
  const { id } = await params;
  const now = await nowMs();
  const res = await run(
    "UPDATE exchange_posts SET status = 'cancelled', closed_at = ? WHERE id = ? AND student_id = ? AND status = 'open'",
    [new Date(now).toISOString(), Number(id), user.id],
  );
  if (res.rowsAffected === 0) throw bad('This post is already closed.');
  return NextResponse.json({ ok: true });
});
