import { NextResponse } from 'next/server';
import { one, nowMs } from '@/lib/db';
import { handler, requireUser, bad } from '@/lib/auth';
import { checkIn } from '@/lib/checkin';

// POST /api/checkin/counter  { rollNo } -> staff check a student in by roll number
// (fallback for students without a phone).
export const POST = handler(async (request) => {
  const staff = await requireUser(request, 'staff');
  const { rollNo } = await request.json().catch(() => ({}));
  if (!rollNo) throw bad('Enter a roll number.');
  const student = await one("SELECT * FROM users WHERE roll_no = ? AND role = 'student'", [String(rollNo).trim()]);
  if (!student) {
    return NextResponse.json({ result: 'not_found', title: 'Student not found', detail: `No student with roll number ${rollNo}.` });
  }
  const result = await checkIn({ student, atUnit: staff.mess_unit, nowMs: await nowMs(), method: 'counter' });
  return NextResponse.json(result);
});
