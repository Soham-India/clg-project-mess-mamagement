import { NextResponse } from 'next/server';
import { one, run } from '@/lib/db';
import { handler, requireUser, HttpError } from '@/lib/auth';

// DELETE /api/notices/:id -> staff delete their own notices; society and admin can delete any.
export const DELETE = handler(async (request, { params }) => {
  const user = await requireUser(request, 'staff', 'society', 'admin');
  const { id } = await params;
  const n = await one('SELECT id, author_id FROM notices WHERE id = ?', [Number(id)]);
  if (!n) throw new HttpError(404, 'Notice not found.');
  if (user.role === 'staff' && n.author_id !== user.id) throw new HttpError(403, 'You can only delete notices you posted.');
  await run('DELETE FROM notices WHERE id = ?', [n.id]);
  return NextResponse.json({ ok: true });
});
