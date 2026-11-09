import { NextResponse } from 'next/server';
import { all, one, run, nowMs } from '@/lib/db';
import { handler, requireUser, bad } from '@/lib/auth';
import { ist, addDays } from '@/lib/clock';
import { MESS_UNITS, MEAL_KEYS, NOTICE_KINDS, noticeState, unitName } from '@/lib/constants';

const POSTERS = ['staff', 'society', 'admin'];
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

function shape(n, user, today) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    meal: n.meal,
    messUnit: n.mess_unit,
    messUnitName: n.mess_unit ? unitName(n.mess_unit) : 'All messes',
    startsOn: n.starts_on,
    endsOn: n.ends_on,
    pinned: Boolean(n.pinned),
    state: noticeState(today, n.starts_on, n.ends_on),
    author: n.author_name,
    authorRole: n.author_role,
    createdAt: n.created_at,
    // Staff delete only their own; society and admin can delete any notice.
    canDelete: user.role === 'society' || user.role === 'admin' || n.author_id === user.id,
  };
}

// GET /api/notices -> notices you can see (current, upcoming, and those that ended in the last 30 days).
//  student/staff: notices for their mess + notices for every mess · society/admin: all.
export const GET = handler(async (request) => {
  const user = await requireUser(request);
  const today = ist(await nowMs()).date;
  const scoped = user.role === 'student' || user.role === 'staff';
  const rows = await all(
    `SELECT n.*, u.name AS author_name, u.role AS author_role FROM notices n JOIN users u ON u.id = n.author_id
      WHERE n.ends_on >= ? ${scoped ? 'AND (n.mess_unit IS NULL OR n.mess_unit = ?)' : ''}
      ORDER BY n.pinned DESC, n.starts_on, n.id DESC`,
    scoped ? [addDays(today, -30), user.mess_unit] : [addDays(today, -30)],
  );
  const order = { current: 0, upcoming: 1, past: 2 };
  const notices = rows
    .map((n) => shape(n, user, today))
    .sort((a, b) => order[a.state] - order[b.state] || (a.state === 'past' ? b.endsOn.localeCompare(a.endsOn) : 0));
  return NextResponse.json({ today, notices });
});

// POST /api/notices  { title, body, kind, meal, messUnit, startsOn, endsOn, pinned }
//  staff: always for their own mess · society/admin: one mess, or every mess (messUnit empty).
export const POST = handler(async (request) => {
  const user = await requireUser(request, ...POSTERS);
  const b = await request.json().catch(() => ({}));
  const today = ist(await nowMs()).date;

  const title = String(b.title || '').trim();
  const body = String(b.body || '').trim();
  if (title.length < 4) throw bad('Give the notice a title of at least 4 characters.');
  if (title.length > 80) throw bad('Keep the title under 80 characters.');
  if (body.length < 10) throw bad('Write at least 10 characters in the notice.');
  if (body.length > 600) throw bad('Keep the notice under 600 characters.');
  if (!NOTICE_KINDS.some((k) => k.key === b.kind)) throw bad('Pick a notice type.');
  if (b.meal && !MEAL_KEYS.includes(b.meal)) throw bad('Pick a valid meal.');
  if (!isDate(b.startsOn) || !isDate(b.endsOn)) throw bad('Pick a start and an end date.');
  if (b.endsOn < b.startsOn) throw bad('The end date must be on or after the start date.');
  if (b.endsOn < today) throw bad('The end date is already over. Pick today or a later date.');
  if (b.endsOn > addDays(today, 90)) throw bad('Notices can run at most 90 days ahead.');

  let messUnit;
  if (user.role === 'staff') messUnit = user.mess_unit;
  else {
    messUnit = b.messUnit || null;
    if (messUnit && !MESS_UNITS.some((u) => u.code === messUnit)) throw bad('Pick a valid mess.');
  }

  const res = await run(
    `INSERT INTO notices (title, body, kind, meal, mess_unit, starts_on, ends_on, pinned, author_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [title, body, b.kind, b.meal || null, messUnit, b.startsOn, b.endsOn, b.pinned ? 1 : 0, user.id, new Date(await nowMs()).toISOString()],
  );
  const notice = await one('SELECT id FROM notices WHERE id = ?', [Number(res.lastInsertRowid)]);
  return NextResponse.json({ ok: true, notice }, { status: 201 });
});
