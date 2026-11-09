import { NextResponse } from 'next/server';
import { one, run } from '@/lib/db';
import { handler, requireUser, HttpError, bad } from '@/lib/auth';

// POST /api/complaints/:id/metoo -> toggle "me too" on a complaint in your mess.
export const POST = handler(async (request, { params }) => {
  const user = await requireUser(request, 'student');
  const { id } = await params;
  const c = await one('SELECT * FROM complaints WHERE id = ?', [Number(id)]);
  if (!c || c.mess_unit !== user.mess_unit) throw new HttpError(404, 'Complaint not found.');
  if (c.student_id === user.id) throw bad('This is your own complaint.');
  const has = await one('SELECT 1 AS x FROM complaint_metoo WHERE complaint_id = ? AND user_id = ?', [c.id, user.id]);
  if (has) await run('DELETE FROM complaint_metoo WHERE complaint_id = ? AND user_id = ?', [c.id, user.id]);
  else await run('INSERT INTO complaint_metoo (complaint_id, user_id) VALUES (?,?)', [c.id, user.id]);
  return NextResponse.json({ ok: true, metoo: !has });
});
