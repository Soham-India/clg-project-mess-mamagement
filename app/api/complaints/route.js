import { NextResponse } from 'next/server';
import { all, run, one } from '@/lib/db';
import { handler, requireUser, bad } from '@/lib/auth';
import { COMPLAINT_CATEGORIES, MEAL_KEYS, unitName } from '@/lib/constants';

// GET /api/complaints -> complaints visible to you:
//  student: their own mess · staff: their own mess · society/admin: every mess.
export const GET = handler(async (request) => {
  const user = await requireUser(request);
  const where = user.role === 'student' || user.role === 'staff' ? 'WHERE c.mess_unit = ?' : '';
  const args = where ? [user.mess_unit] : [];
  const rows = await all(
    `SELECT c.*, u.name AS author_name, u.roll_no AS author_roll,
            (SELECT COUNT(*) FROM complaint_metoo m WHERE m.complaint_id = c.id) AS metoo,
            (SELECT COUNT(*) FROM complaint_metoo m WHERE m.complaint_id = c.id AND m.user_id = ${Number(user.id)}) AS i_metoo
       FROM complaints c JOIN users u ON u.id = c.student_id ${where}
      ORDER BY CASE c.status WHEN 'escalated' THEN 0 WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, c.created_at DESC`,
    args,
  );
  const ids = rows.map((r) => r.id);
  const history = ids.length
    ? await all(
        `SELECT h.complaint_id, h.status, h.note, h.at, u.name, u.role FROM complaint_history h
           JOIN users u ON u.id = h.by_id WHERE h.complaint_id IN (${ids.map(() => '?').join(',')}) ORDER BY h.at, h.id`,
        ids,
      )
    : [];

  const complaints = rows.map((c) => {
    const mine = c.student_id === user.id;
    // Anonymous: other students see "Anonymous"; staff, society and admin still see the author.
    const hideAuthor = c.anonymous && user.role === 'student' && !mine;
    return {
      id: c.id,
      category: c.category,
      meal: c.meal,
      text: c.text,
      status: c.status,
      reply: c.reply,
      anonymous: Boolean(c.anonymous),
      messUnit: c.mess_unit,
      messUnitName: unitName(c.mess_unit),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      author: hideAuthor ? 'Anonymous' : c.author_name,
      authorRoll: hideAuthor ? null : c.author_roll,
      mine,
      metoo: Number(c.metoo),
      iMetoo: Number(c.i_metoo) > 0,
      history: history
        .filter((h) => h.complaint_id === c.id)
        .map((h) => ({
          status: h.status,
          note: h.note,
          at: h.at,
          by: h.role === 'student' && c.anonymous && hideAuthor ? 'Anonymous' : h.name,
        })),
    };
  });
  return NextResponse.json({ complaints });
});

// POST /api/complaints  { category, meal, text, anonymous } -> students raise a complaint about their mess.
export const POST = handler(async (request) => {
  const user = await requireUser(request, 'student');
  const { category, meal, text, anonymous } = await request.json().catch(() => ({}));
  if (!COMPLAINT_CATEGORIES.some((c) => c.key === category)) throw bad('Pick a category.');
  if (meal && !MEAL_KEYS.includes(meal)) throw bad('Pick a valid meal.');
  const body = String(text || '').trim();
  if (body.length < 10) throw bad('Describe the problem in at least 10 characters.');
  if (body.length > 600) throw bad('Keep it under 600 characters.');
  const at = new Date().toISOString();
  const res = await run(
    'INSERT INTO complaints (student_id, anonymous, mess_unit, category, meal, text, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [user.id, anonymous ? 1 : 0, user.mess_unit, category, meal || null, body, 'open', at, at],
  );
  const id = Number(res.lastInsertRowid);
  await run('INSERT INTO complaint_history (complaint_id, status, by_id, note, at) VALUES (?,?,?,?,?)', [id, 'open', user.id, 'Complaint raised', at]);
  return NextResponse.json({ ok: true, complaint: await one('SELECT id, status FROM complaints WHERE id = ?', [id]) }, { status: 201 });
});
