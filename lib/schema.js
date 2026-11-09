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

-- Notice board: special meals, veg-only days, service issues. mess_unit NULL = every mess.
-- Shown from starts_on to ends_on (IST dates, inclusive).
CREATE TABLE IF NOT EXISTS notices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('special','veg_only','change','issue','general')),
  meal       TEXT CHECK (meal IN ('breakfast','lunch','dinner')),
  mess_unit  TEXT REFERENCES mess_units(code),
  starts_on  TEXT NOT NULL,
  ends_on    TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0,
  author_id  INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  CHECK (ends_on >= starts_on)
);

-- Late buys: a single coupon for a meal today, bought outside the weekly order (meal price + late fee,
-- at least 1 hour before the meal). The coupon itself is a normal row in coupons (order_id NULL).
CREATE TABLE IF NOT EXISTS late_purchases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL REFERENCES users(id),
  coupon_id   INTEGER NOT NULL REFERENCES coupons(id),
  date        TEXT NOT NULL,
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  price       INTEGER NOT NULL,
  fee         INTEGER NOT NULL,
  payment_ref TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- Coupon exchange inside one mess, at the coupon's own price.
--  kind 'sell':    student_id offers coupon_id; taker_id is the buyer.
--  kind 'request': student_id needs (date, meal); taker_id is the seller, coupon_id the coupon they gave.
-- Not stored: an open post whose meal has started is shown as expired.
CREATE TABLE IF NOT EXISTS exchange_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL CHECK (kind IN ('sell','request')),
  student_id  INTEGER NOT NULL REFERENCES users(id),
  mess_unit   TEXT NOT NULL REFERENCES mess_units(code),
  date        TEXT NOT NULL,
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  coupon_id   INTEGER,
  price       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  taker_id    INTEGER REFERENCES users(id),
  payment_ref TEXT,
  created_at  TEXT NOT NULL,
  closed_at   TEXT
);
-- A coupon can be on sale only once; a student can ask for a meal only once at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_open_sell ON exchange_posts (coupon_id) WHERE status = 'open' AND kind = 'sell';
CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_open_request ON exchange_posts (student_id, date, meal) WHERE status = 'open' AND kind = 'request';
CREATE INDEX IF NOT EXISTS idx_exchange_board ON exchange_posts (mess_unit, status, date);

CREATE INDEX IF NOT EXISTS idx_coupons_slot ON coupons (mess_unit, date, meal);
CREATE INDEX IF NOT EXISTS idx_checkins_slot ON checkins (mess_unit, date, meal);
`;
