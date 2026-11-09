import { NextResponse } from 'next/server';
import { handler, requireUser, publicUser } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { unitName } from '@/lib/constants';

// GET /api/auth/me -> the logged-in user, plus whether the demo clock is active.
export const GET = handler(async (request) => {
  const user = await requireUser(request);
  const { clockOffsetMs } = await getSettings();
  return NextResponse.json({
    user: { ...publicUser(user), messUnitName: user.mess_unit ? unitName(user.mess_unit) : null },
    demoClock: clockOffsetMs !== 0,
  });
});
