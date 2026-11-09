// Demo data, created automatically the first time the app talks to an empty database.
// Every demo account uses the password: demo1234
import bcrypt from 'bcryptjs';
import { MESS_UNITS, MEALS, DEFAULT_PRICES, DEFAULT_MIN_DAYS } from './constants.js';
import { ist, mondayOf, weekDates, istToMs } from './clock.js';
import { messUnitFor } from './messAllocation.js';

export const DEMO_PASSWORD = 'demo1234';

// Weekly menu (Mon..Sun). Same base menu for every mess; staff can edit their own.
const MENU = [
  ['Poha, boiled egg / banana, tea', 'Rice, dal, aloo bhaja, mixed veg, curd', 'Roti, rice, egg curry / paneer masala, dal'],
  ['Idli, sambar, coconut chutney, coffee', 'Rice, dal fry, bhindi fry, papad', 'Roti, rice, chole, jeera aloo, salad'],
  ['Aloo paratha, curd, pickle, tea', 'Jeera rice, rajma, cabbage fry, curd', 'Roti, rice, fish curry / mushroom masala, dal'],
  ['Upma, boiled egg / fruit, tea', 'Rice, dalma, aloo posto, papad', 'Roti, fried rice, chilli chicken / chilli paneer'],
  ['Puri, ghugni, tea', 'Rice, sambar, beans poriyal, curd', 'Roti, rice, kadhai paneer, dal tadka, kheer'],
  ['Dosa, sambar, chutney, coffee', 'Veg pulao, raita, dal, aloo gobi', 'Roti, rice, egg bhurji / matar paneer, dal'],
  ['Chole bhature, tea', 'Chicken biryani / veg biryani, raita, salan', 'Roti, rice, mix dal, aloo matar, gulab jamun'],
];

const BOYS = ['Aditya', 'Rohan', 'Sourav', 'Abhishek', 'Kunal', 'Debasish', 'Nikhil', 'Pratik', 'Saurabh', 'Ankit', 'Harsh', 'Manas', 'Subham', 'Rakesh', 'Tushar', 'Yash', 'Ayush', 'Sambit', 'Jyoti', 'Bikash'];
const GIRLS = ['Sneha', 'Pooja', 'Ritika', 'Shreya', 'Ananya', 'Megha', 'Tanvi', 'Swati', 'Kriti', 'Diya', 'Aishwarya', 'Nandini', 'Sonali', 'Pragyan', 'Lipsa', 'Ankita'];
const SURNAMES = ['Mohanty', 'Behera', 'Panda', 'Sahoo', 'Mishra', 'Swain', 'Agarwal', 'Das', 'Nayak', 'Jena', 'Tripathy', 'Pradhan', 'Rout', 'Senapati', 'Dash', 'Patnaik', 'Biswal', 'Sethi', 'Kar', 'Mallick', 'Parida', 'Lenka', 'Hota', 'Barik'];

// Tiny deterministic random generator so the demo data is the same every time.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function seed(client) {
  const rand = rng(42);
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);
  const nowMs = Date.now();
  const now = ist(nowMs);
  const thisWeek = weekDates(mondayOf(now.date));
  const isoNow = new Date(nowMs).toISOString();

  // A realistic time during a meal, for seeded check-ins.
  const mealTime = (date, meal) => {
    const m = MEALS.find((x) => x.key === meal);
    return new Date(istToMs(date, m.start) + Math.floor(rand() * 100) * 60_000).toISOString();
  };

  const stmts = [];
  const q = (sql, args = []) => stmts.push({ sql, args });

  for (const u of MESS_UNITS) q('INSERT INTO mess_units (code, name, short, plan) VALUES (?,?,?,?)', [u.code, u.name, u.short, u.plan]);

  q('INSERT INTO settings (key, value) VALUES (?, ?)', ['prices', JSON.stringify(DEFAULT_PRICES)]);
  q('INSERT INTO settings (key, value) VALUES (?, ?)', ['min_days', JSON.stringify(DEFAULT_MIN_DAYS)]);
  q('INSERT INTO settings (key, value) VALUES (?, ?)', ['clock_offset_ms', '0']);
  q('INSERT INTO settings (key, value) VALUES (?, ?)', ['relaxed_hours', 'true']);

  for (const u of MESS_UNITS) {
    MENU.forEach((day, d) => MEALS.forEach((m, i) => q('INSERT INTO menu_items (mess_unit, day, meal, items) VALUES (?,?,?,?)', [u.code, d, m.key, day[i]])));
  }

  // ---- Users -------------------------------------------------------------
  // The named demo accounts (shown as one-click buttons on the login page).
  const people = [
    { name: 'Riya Patnaik', email: 'riya@iiit-bh.demo', roll: 'B525014', batch: 1, gender: 'F', plan: 'fixed' },
    { name: 'Karan Sahu', email: 'karan@iiit-bh.demo', roll: 'B524045', batch: 2, gender: 'M', plan: 'fixed' },
    { name: 'Priya Nayak', email: 'priya@iiit-bh.demo', roll: 'B523011', batch: 3, gender: 'F', plan: 'fixed' },
    { name: 'Aman Verma', email: 'aman@iiit-bh.demo', roll: 'B523052', batch: 3, gender: 'M', plan: 'coupon' },
    { name: 'Vikram Rath', email: 'vikram@iiit-bh.demo', roll: 'B522033', batch: 4, gender: 'M', plan: 'coupon' },
    { name: 'Neha Singh', email: 'neha@iiit-bh.demo', roll: 'B523057', batch: 3, gender: 'F', plan: 'coupon' },
  ];
  // Filler students so headcounts look realistic.
  let n = 100;
  const filler = (batch, gender, plan, count) => {
    const names = gender === 'F' ? GIRLS : BOYS;
    for (let i = 0; i < count; i++) {
      n += 1;
      const roll = `B5${26 - batch}${String(n).padStart(3, '0')}`;
      people.push({ name: `${names[n % names.length]} ${SURNAMES[(n * 7) % SURNAMES.length]}`, email: `${roll.toLowerCase()}@iiit-bh.demo`, roll, batch, gender, plan });
    }
  };
  filler(1, 'M', 'fixed', 10); filler(1, 'F', 'fixed', 8);
  filler(2, 'M', 'fixed', 9); filler(2, 'F', 'fixed', 6);
  filler(3, 'M', 'fixed', 5); filler(4, 'F', 'fixed', 4);
  filler(3, 'M', 'coupon', 8); filler(4, 'M', 'coupon', 6);
  filler(3, 'F', 'coupon', 5); filler(4, 'F', 'coupon', 4);

  let id = 0;
  for (const p of people) {
    id += 1;
    p.id = id;
    p.unit = messUnitFor(p);
    q(`INSERT INTO users (id, name, email, roll_no, password_hash, role, batch, gender, plan, mess_unit)
       VALUES (?,?,?,?,?, 'student', ?,?,?,?)`, [id, p.name, p.email, p.roll, hash, p.batch, p.gender, p.plan, p.unit]);
  }
  const staff = [
    ['Biswajit (FY mess)', 'staff.fy@iiit-bh.demo', 'FY'],
    ['Ramesh (Main Boys)', 'staff.mainb@iiit-bh.demo', 'MAIN-B'],
    ['Sunita (Main Girls)', 'staff.maing@iiit-bh.demo', 'MAIN-G'],
    ['Prakash (Coupon Boys)', 'staff.cpnb@iiit-bh.demo', 'CPN-B'],
    ['Lata (Coupon Girls)', 'staff.cpng@iiit-bh.demo', 'CPN-G'],
  ];
  const staffIds = {};
  for (const [name, email, unit] of staff) {
    id += 1;
    staffIds[unit] = id;
    q("INSERT INTO users (id, name, email, password_hash, role, mess_unit) VALUES (?,?,?,?, 'staff', ?)", [id, name, email, hash, unit]);
  }
  id += 1;
  const societyId = id;
  q("INSERT INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?, 'society')", [id, 'Mess Society (Ishaan)', 'society@iiit-bh.demo', hash]);
  id += 1;
  q("INSERT INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?, 'admin')", [id, 'Hostel Office (Admin)', 'admin@iiit-bh.demo', hash]);

  // ---- This week's coupons for coupon students ------------------------------
  // Bought "last weekend" so the wallet, headcount and check-in have data.
  const prices = DEFAULT_PRICES;
  let couponId = 0;
  let orderId = 0;
  for (const p of people.filter((x) => x.plan === 'coupon')) {
    const picks = [];
    thisWeek.forEach((date, d) => {
      for (const m of MEALS) {
        let take;
        if (p.email === 'aman@iiit-bh.demo') take = m.key !== 'breakfast' || d % 2 === 0; // lunch+dinner daily, some breakfasts
        else take = m.key === 'breakfast' ? rand() < 0.35 : rand() < 0.75;
        if (take) picks.push({ date, meal: m.key });
      }
    });
    let total = picks.reduce((s, x) => s + prices[x.meal], 0);
    // Make sure the minimum (₹476) is met.
    for (const date of thisWeek) {
      if (total >= prices.breakfast * 4 + prices.lunch * 4 + prices.dinner * 4) break;
      for (const m of MEALS) {
        if (!picks.some((x) => x.date === date && x.meal === m.key)) {
          picks.push({ date, meal: m.key });
          total += prices[m.key];
        }
      }
    }
    orderId += 1;
    q('INSERT INTO coupon_orders (id, student_id, week_start, total, payment_ref, created_at) VALUES (?,?,?,?,?,?)',
      [orderId, p.id, thisWeek[0], total, `DEMO-${1000 + orderId}`, isoNow]);
    for (const x of picks) {
      couponId += 1;
      const mealEnd = MEALS.find((m) => m.key === x.meal).end;
      const past = istToMs(x.date, mealEnd) < nowMs;
      const used = past && rand() < 0.85;
      const at = used ? mealTime(x.date, x.meal) : null;
      q(`INSERT INTO coupons (id, order_id, student_id, original_student_id, mess_unit, date, meal, price, status, used_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [couponId, orderId, p.id, p.id, p.unit, x.date, x.meal, prices[x.meal], used ? 'used' : 'unused', at]);
      if (used) q("INSERT INTO checkins (student_id, mess_unit, date, meal, at, method) VALUES (?,?,?,?,?, 'code')", [p.id, p.unit, x.date, x.meal, at]);
    }
  }

  // ---- Past check-ins for fixed-plan students -------------------------------
  for (const p of people.filter((x) => x.plan === 'fixed')) {
    for (const date of thisWeek) {
      for (const m of MEALS) {
        if (istToMs(date, m.end) < nowMs && rand() < 0.7) {
          q("INSERT INTO checkins (student_id, mess_unit, date, meal, at, method) VALUES (?,?,?,?,?, 'code')", [p.id, p.unit, date, m.key, mealTime(date, m.key)]);
        }
      }
    }
  }

  // ---- Complaints ----------------------------------------------------------------
  const byEmail = (e) => people.find((p) => p.email === e);
  const complaints = [
    { who: byEmail('aman@iiit-bh.demo'), anon: 0, cat: 'quantity', meal: 'dinner', text: 'Paneer pieces in dinner were very few, and the second helping of dal ran out by 8:15.', status: 'in_progress', reply: 'Noted. We will increase the quantity from this week.' },
    { who: byEmail('priya@iiit-bh.demo'), anon: 1, cat: 'hygiene', meal: 'lunch', text: 'Plates at the counter were still wet and smelled of soap. Please dry them properly.', status: 'open', reply: null },
    { who: byEmail('karan@iiit-bh.demo'), anon: 0, cat: 'quality', meal: 'breakfast', text: 'Idli was undercooked on Tuesday, sticky in the middle.', status: 'resolved', reply: 'Steamer timing fixed. Thanks for flagging.' },
    { who: byEmail('neha@iiit-bh.demo'), anon: 0, cat: 'staff', meal: 'lunch', text: 'Counter closed 15 minutes before 2 PM twice this week.', status: 'escalated', reply: null },
  ];
  complaints.forEach((c, i) => {
    const cid = i + 1;
    q(`INSERT INTO complaints (id, student_id, anonymous, mess_unit, category, meal, text, status, reply, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [cid, c.who.id, c.anon, c.who.unit, c.cat, c.meal, c.text, c.status, c.reply, isoNow, isoNow]);
    q('INSERT INTO complaint_history (complaint_id, status, by_id, note, at) VALUES (?,?,?,?,?)', [cid, 'open', c.who.id, 'Complaint raised', isoNow]);
    if (c.status === 'in_progress' || c.status === 'resolved') {
      q('INSERT INTO complaint_history (complaint_id, status, by_id, note, at) VALUES (?,?,?,?,?)', [cid, c.status, staffIds[c.who.unit], c.reply, isoNow]);
    }
    if (c.status === 'escalated') {
      q('INSERT INTO complaint_history (complaint_id, status, by_id, note, at) VALUES (?,?,?,?,?)', [cid, 'escalated', societyId, 'Repeated issue. Raised with the contractor.', isoNow]);
    }
  });
  // A few "me too" votes.
  people.slice(6, 12).forEach((p) => q('INSERT INTO complaint_metoo (complaint_id, user_id) VALUES (?,?)', [2, p.id]));

  await client.batch(stmts, 'write');
}

// Demo buyer (see DEMO_BUYER_EMAIL in couponRules.js): a 3rd-year coupon student with no orders,
// used to record the coupon purchase flow on any day. Added on startup if missing, so it also
// appears in an already-seeded production database.
export async function ensureDemoBuyer(client) {
  const { rows } = await client.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: ['arjun@iiit-bh.demo'] });
  if (rows.length) return;
  const p = { batch: 3, gender: 'M', plan: 'coupon' };
  await client.execute({
    sql: `INSERT OR IGNORE INTO users (name, email, roll_no, password_hash, role, batch, gender, plan, mess_unit)
          VALUES (?,?,?,?, 'student', ?,?,?,?)`,
    args: ['Arjun Das', 'arjun@iiit-bh.demo', 'B523099', bcrypt.hashSync(DEMO_PASSWORD, 8), p.batch, p.gender, p.plan, messUnitFor(p)],
  });
}
