// SQLite schema. UNIQUE and CHECK constraints guard the rules at the database level too.
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS mess_units (
  code  TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  short TEXT NOT NULL,
  plan  TEXT NOT NULL CHECK (plan IN ('fixed','coupon'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  roll_no       TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','staff','society','admin')),
  batch         INTEGER CHECK (batch BETWEEN 1 AND 4),
  gender        TEXT CHECK (gender IN ('M','F')),
  plan          TEXT CHECK (plan IN ('fixed','coupon')),
  mess_unit     TEXT REFERENCES mess_units(code),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Weekly repeating menu per mess unit. day: 0 = Monday ... 6 = Sunday
CREATE TABLE IF NOT EXISTS menu_items (
  mess_unit  TEXT NOT NULL REFERENCES mess_units(code),
  day        INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  items      TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT,
  PRIMARY KEY (mess_unit, day, meal)
);

-- One purchase per student per week.
CREATE TABLE IF NOT EXISTS coupon_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL REFERENCES users(id),
  week_start  TEXT NOT NULL,
  total       INTEGER NOT NULL,
  payment_ref TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  UNIQUE (student_id, week_start)
);

-- One coupon = one meal on one date. A student can hold at most one per slot.
CREATE TABLE IF NOT EXISTS coupons (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            INTEGER REFERENCES coupon_orders(id),
  student_id          INTEGER NOT NULL REFERENCES users(id),
  original_student_id INTEGER NOT NULL REFERENCES users(id),
  mess_unit           TEXT NOT NULL REFERENCES mess_units(code),
  date                TEXT NOT NULL,
  meal                TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  price               INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used')),
  used_at             TEXT,
  UNIQUE (student_id, date, meal)
);

CREATE TABLE IF NOT EXISTS transfers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id  INTEGER NOT NULL REFERENCES coupons(id),
  from_id    INTEGER NOT NULL REFERENCES users(id),
  to_id      INTEGER NOT NULL REFERENCES users(id),
  at         TEXT NOT NULL
);

-- One check-in per student per meal per day.
CREATE TABLE IF NOT EXISTS checkins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  mess_unit  TEXT NOT NULL REFERENCES mess_units(code),
  date       TEXT NOT NULL,
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  at         TEXT NOT NULL,
  method     TEXT NOT NULL CHECK (method IN ('code','counter')),
  UNIQUE (student_id, date, meal)
);

CREATE TABLE IF NOT EXISTS complaints (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  anonymous  INTEGER NOT NULL DEFAULT 0,
  mess_unit  TEXT NOT NULL REFERENCES mess_units(code),
  category   TEXT NOT NULL CHECK (category IN ('hygiene','quality','quantity','staff','other')),
  meal       TEXT CHECK (meal IN ('breakfast','lunch','dinner')),
  text       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','escalated')),
  reply      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  by_id        INTEGER NOT NULL REFERENCES users(id),
  note         TEXT,
  at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_metoo (
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (complaint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupons_slot ON coupons (mess_unit, date, meal);
CREATE INDEX IF NOT EXISTS idx_checkins_slot ON checkins (mess_unit, date, meal);
`;
