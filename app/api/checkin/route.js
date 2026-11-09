import { NextResponse } from 'next/server';
import { nowMs } from '@/lib/db';
import { handler, requireUser, bad } from '@/lib/auth';
import { unitForCode } from '@/lib/checkinCode';
import { checkIn } from '@/lib/checkin';

// POST /api/checkin  { code } -> a student checks in with the code shown on the mess screen.
// The code tells us WHICH mess they are standing at.
export const POST = handler(async (request) => {
  const student = await requireUser(request, 'student');
  const { code } = await request.json().catch(() => ({}));
  if (!code) throw bad('Enter the 6-character code shown at the mess entrance.');
  const atUnit = unitForCode(code);
  if (!atUnit) {
    return NextResponse.json({
      result: 'invalid_code',
      title: 'Code not valid',
      detail: 'The code may have changed. Codes refresh every 30 seconds; enter the one on the screen now.',
    });
  }
  const result = await checkIn({ student, atUnit, nowMs: await nowMs(), method: 'code' });
  return NextResponse.json(result);
});
