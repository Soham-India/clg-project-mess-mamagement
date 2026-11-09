import { NextResponse } from 'next/server';
import { nowMs } from '@/lib/db';
import { handler, requireUser } from '@/lib/auth';
import { headcount } from '@/lib/checkin';
import { ist, addDays } from '@/lib/clock';
import { MESS_UNITS, unitName } from '@/lib/constants';

// GET /api/headcount?unit=CPN-B -> how many to cook for (expected) and how many served,
// for today and tomorrow. Staff see their own mess; society and admin can pick any.
export const GET = handler(async (request) => {
  const user = await requireUser(request, 'staff', 'society', 'admin');
  const asked = request.nextUrl.searchParams.get('unit');
  const unit = user.role === 'staff' ? user.mess_unit : MESS_UNITS.some((u) => u.code === asked) ? asked : 'MAIN-B';
  const today = ist(await nowMs()).date;
  const tomorrow = addDays(today, 1);
  const plan = MESS_UNITS.find((u) => u.code === unit).plan;
  return NextResponse.json({
    unit,
    unitName: unitName(unit),
    plan,
    basis: plan === 'coupon' ? 'Coupons sold for each meal' : 'All students allotted to this mess',
    today: { date: today, meals: await headcount(unit, today) },
    tomorrow: { date: tomorrow, meals: await headcount(unit, tomorrow) },
  });
});
