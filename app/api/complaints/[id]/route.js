import { NextResponse } from 'next/server';
import { one, run } from '@/lib/db';
import { handler, requireUser, bad, HttpError } from '@/lib/auth';

// Who may move a complaint to which status:
//  staff (their mess): open -> in_progress -> resolved, with a reply
//  society:            any -> escalated, escalated -> resolved
//  student (author):   resolved -> open (reopen, once they disagree)
const ALLOWED = {
  staff: { open: ['in_progress', 'resolved'], in_progress: ['resolved'] },
  society: { open: ['escalated'], in_progress: ['escalated'], escalated: ['resolved'], resolved: ['escalated'] },
  student: { resolved: ['open'] },
  admin: {},
};

// PATCH /api/complaints/:id  { status, note }
export const PATCH = handler(async (request, { params }) => {
  const user = await requireUser(request, 'staff', 'society', 'student');
  const { id } = await params;
  const { status, note } = await request.json().catch(() => ({}));
  const c = await one('SELECT * FROM complaints WHERE id = ?', [Number(id)]);
  if (!c) throw new HttpError(404, 'Complaint not found.');
  if (user.role === 'staff' && c.mess_unit !== user.mess_unit) throw new HttpError(403, 'This complaint is about another mess.');
  if (user.role === 'student' && c.student_id !== user.id) throw new HttpError(403, 'Only the author can reopen a complaint.');

  const allowed = ALLOWED[user.role][c.status] || [];
  if (!allowed.includes(status)) throw bad(`You can't move this complaint from "${c.status}" to "${status}".`);
  const text = String(note || '').trim();
  if (user.role === 'staff' && text.length < 3) throw bad('Write a short reply for the student.');
  if (text.length > 400) throw bad('Keep the note under 400 characters.');

  const at = new Date().toISOString();
  const reply = user.role === 'staff' ? text : c.reply;
  await run('UPDATE complaints SET status = ?, reply = ?, updated_at = ? WHERE id = ?', [status, reply, at, c.id]);
  await run('INSERT INTO complaint_history (complaint_id, status, by_id, note, at) VALUES (?,?,?,?,?)', [c.id, status, user.id, text || null, at]);
  return NextResponse.json({ ok: true });
});
