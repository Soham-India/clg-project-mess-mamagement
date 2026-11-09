// Database: SQLite through libSQL.
//  - Locally it is a plain file (local.db), nothing to install.
//  - In production it is Turso (hosted SQLite): set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
// Tables are created, and demo data is seeded, automatically on the first request.
import { createClient } from '@libsql/client';
import { SCHEMA } from './schema.js';
import { seed } from './seed.js';

function makeClient() {
  let url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    // On Vercel without Turso the only writable folder is /tmp (data resets on redeploy).
    url = process.env.VERCEL ? 'file:/tmp/thali.db' : 'file:local.db';
  }
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

const globalForDb = globalThis;
const client = globalForDb.__thaliDb ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForDb.__thaliDb = client;

let ready = globalForDb.__thaliReady ?? null;

async function init() {
  await client.executeMultiple(SCHEMA);
  const { rows } = await client.execute('SELECT COUNT(*) AS n FROM users');
  if (Number(rows[0].n) === 0) await seed(client);
}

/** Returns the database client once the schema and demo data exist. */
export async function getDb() {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null;
      throw err;
    });
    globalForDb.__thaliReady = ready;
  }
  await ready;
  return client;
}

// Small helpers so route code stays short.
export async function all(sql, args = []) {
  const db = await getDb();
  const res = await db.execute({ sql, args });
  return res.rows.map((r) => ({ ...r }));
}
export async function one(sql, args = []) {
  return (await all(sql, args))[0] ?? null;
}
export async function run(sql, args = []) {
  const db = await getDb();
  return db.execute({ sql, args });
}

// Settings live in a key/value table so the admin can change them without code changes.
export async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  const s = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return {
    prices: s.prices,
    minDays: s.min_days,
    clockOffsetMs: s.clock_offset_ms ?? 0,
    relaxedHours: s.relaxed_hours ?? true,
  };
}
export async function setSetting(key, value) {
  await run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}

/** Current time in ms, including the admin's demo clock offset. */
export async function nowMs() {
  const { clockOffsetMs } = await getSettings();
  return Date.now() + clockOffsetMs;
}
