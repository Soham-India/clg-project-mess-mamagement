# CampusBite — IIIT Bhubaneswar Mess Management System

**IWT Project** · Soham Mishra · B423063

**Live app:** _paste your Vercel URL here_ · **Demo password for every account:** `demo1234`

CampusBite runs the day-to-day work of the IIIT Bhubaneswar messes: weekly menus, weekly coupon purchase for the coupon mess, a rotating-code check-in at the mess entrance, "cook for" headcounts for the contractor, and complaints that the mess society can escalate.

---

## 1. Features

| Role | What they can do |
| --- | --- |
| **Student — fixed plan** (1st/2nd years, and 3rd/4th years who opted in) | See their own mess and its menu, check in with the entrance code, raise complaints (optionally anonymous), "me too" others' complaints, read the notice board (latest notices also show on Home) |
| **Student — coupon plan** (3rd/4th years) | Everything above, plus: plan and buy next week's coupons, see the coupon wallet, give an unused coupon to a friend in the same mess, sell spare coupons or ask for a meal on the **coupon exchange**, **late-buy** one of today's meals (+₹10, up to 1 hour before it) |
| **Mess staff** (contractor, one account per mess) | Show the rotating code on the entrance screen, check students in by roll number, see how many to cook for, edit their mess's menu, reply to and resolve complaints, post notices for their own mess |
| **Mess society** | Dashboard of every mess (students, today's attendance, complaints), escalate complaints to the contractor, cook-for check for any mess, post notices for one mess or every mess |
| **Admin** (hostel office) | Manage students (batch, gender, plan → mess is recomputed), demo clock for showing the time-based rules, post notices for one mess or every mess |

### How the mess works (business rules)

**Mess allotment** is computed by the server, never chosen by hand (`lib/messAllocation.js`):

| Batch | Plan | Mess |
| --- | --- | --- |
| 1st year | Fixed | First-Year Mess (boys and girls together) |
| 2nd year | Fixed | Main Mess — Boys / Girls |
| 3rd / 4th year | Fixed | Main Mess — Boys / Girls |
| 3rd / 4th year | Coupon | Coupon Mess — Boys / Girls |

**Coupon rules** (`lib/couponRules.js`):

- Meals: breakfast ₹20 (7:00–9:00), lunch ₹55 (12:00–14:00), dinner ₹44 (19:00–21:00). Veg and non-veg cost the same.
- A coupon is valid for **one meal on one specific date**.
- Buying window: **Saturday 00:00 – Sunday 23:59** IST, for the next Monday–Sunday.
- **Grace period:** purchases still accepted on Monday until dinner starts; Monday meals that have already started are locked.
- **Weekly minimum:** 4 full days' worth = **₹476**, in any mix of meals. Maximum is 7 full days (₹833).
- One purchase per student per week. **Unused coupons are not refunded.**
- **Late buy:** a student without a coupon for one of **today's** meals can still buy that single meal for its price **+ ₹10**, any day of the week, but only until **1 hour before the meal starts** (breakfast by 06:00, lunch by 11:00, dinner by 18:00). It doesn't count as the weekly order and isn't limited by the window or the minimum. The coupon then works like any other coupon (check-in, cook-for counts, transfer, exchange at its normal price). Rules: `lateBuyOptions` / `lateBuyError` in `lib/couponRules.js`.
- An unused coupon can be **transferred** to another student **in the same mess**, before that meal starts, if they don't already hold that meal.

**Coupon exchange** (`lib/exchange.js`, `app/api/exchange`), for students who don't know who needs a coupon:

- **Sell:** put an unused coupon on sale. Any student of the same mess who doesn't already hold that meal can buy it. Until it sells, the seller can still use it or take it off sale.
- **Ask:** post "I need Wednesday lunch". Any student of the same mess holding an unused coupon for that meal can sell it to them in one tap. Requests can be up to 7 days ahead, at most 6 open at a time.
- The price is always the coupon's own price (₹20 / ₹55 / ₹44), so nobody can profit from reselling. Payment is a demo payment.
- Everything closes when the meal starts. If nobody buys a coupon in time, it expires like any unused coupon (no refund).
- A trade moves the coupon and closes the post in **one transaction** with conditional updates (`WHERE status = 'unused'`, `WHERE status = 'open'`), so two buyers can't get the same coupon and a coupon used at check-in can't be sold.

**Check-in** (`lib/checkinCode.js`, `lib/checkin.js`):

- The entrance screen shows a 6-character code that **changes every 30 seconds** (an HMAC of a secret, the mess, and the time window), so a code shared on WhatsApp stops working quickly.
- Each mess has its own code, so the server knows **which mess the student is standing at**.
- The same code is also shown as a **QR code**. Students tap **Scan QR** on the Check in page and the phone camera reads it and checks them in, with no typing. The QR holds only the rotating code (`CAMPUSBITE-CHECKIN:AB12CD`), so the server runs exactly the same checks. Camera access needs HTTPS (or `localhost`).
- Checks, in order: right mess → (coupon plan) has a coupon for this meal → not already served.
- Results: *Enjoy your meal* · *Wrong mess* · *No coupon for this meal* · *Already served*.

**Notice board** (`app/api/notices`):

- Notices tell students about festival specials (e.g. a Diwali lunch), veg-only days, menu or timing changes, and service issues.
- Each notice has a type, an optional meal, and a **show from / show until** date range (IST). It appears under *Now*, *Coming up* or *Ended* (ended ones stay visible for 30 days).
- **Staff** post for their own mess only. The **society** and **admin** post for one mess or for every mess, and can pin important ones. Students only read.
- Students see notices for their own mess plus the ones for every mess. The two latest also show on their Home page.
- Staff can delete only their own notices; the society and admin can delete any notice.

---

## 2. Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | **Next.js 15** (App Router) + **React 19** | Pages per role, file-based routing |
| State | **Redux Toolkit** + **RTK Query** | Auth state, the coupon planner "cart", toasts; RTK Query caches every API call and refetches after changes |
| Backend | **Next.js Route Handlers on Node.js** (`app/api/**/route.js`) | A REST API running on Node.js, in the same codebase and deployment as the frontend |
| Database | **SQLite via libSQL** (a local file in development, **Turso** hosted SQLite in production) | Lightweight, plain SQL, no database server to install |
| Auth | **bcrypt** password hashes + **JWT** in an **httpOnly cookie** (`jose`) | Browser JavaScript can't read the token, which protects it from XSS |
| Icons | lucide-react | |
| QR codes | `qrcode` (draws the entrance QR), `jsqr` (reads it from the camera) | Works on Android, iPhone and laptops; the browser's built-in scanner doesn't |

### Architecture

```
Browser (React pages + Redux store)
   │  fetch /api/...   (RTK Query)
   ▼
Next.js on Node.js
   ├─ middleware.js           → redirects by login and role
   └─ app/api/**/route.js     → REST API: checks the role, enforces every rule
         │
         ▼
   lib/ (business logic: couponRules, messAllocation, checkin, checkinCode, clock)
         │  SQL
         ▼
   SQLite (local.db) / Turso
```

The planner shows hints like "₹57 short", but **every rule is enforced again on the server**. A request sent with Postman or a modified browser is still rejected.

### Where Redux is used

- `store/authSlice.js` — the logged-in user, filled automatically when `/auth/me` or `/auth/login` succeed (via `extraReducers` matchers).
- `store/plannerSlice.js` — the meal slots ticked in the coupon planner, with reducers for toggle, quick-fill presets and clear, and a memoised selector (`createSelector`) that turns the selection into a sorted list. The selection survives going to the review page and back.
- `store/uiSlice.js` — toast notifications.
- `store/api.js` — RTK Query: every endpoint, with **cache tags** so that, for example, buying coupons refreshes the wallet and home page automatically.

---

## 3. Run it locally

Needs **Node.js 18.18 or newer**.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database file `local.db` and all demo data are created automatically on the first request. To start over with fresh demo data: stop the server, run `npm run db:reset`, start again.

### Demo accounts (password `demo1234`)

| Login | Who |
| --- | --- |
| `aman@iiit-bh.demo` (or roll `B523052`) | Student, 3rd year, coupon plan, Coupon Mess (Boys) |
| `arjun@iiit-bh.demo` (or roll `B523099`) | Coupon buying demo, Coupon Mess (Boys). For this account only, the coupon window behaves as if it is Saturday 10:00 whenever the real window is closed, so the purchase can be shown on any day. All other coupon rules still apply. Its coupons and orders are cleared at each login. |
| `vikram@iiit-bh.demo` (`B522033`) | Student, 4th year, coupon plan, Coupon Mess (Boys) |
| `neha@iiit-bh.demo` (`B523057`) | Student, 3rd year, coupon plan, Coupon Mess (Girls) |
| `priya@iiit-bh.demo` (`B523011`) | Student, 3rd year, fixed plan, Main Mess (Girls) |
| `karan@iiit-bh.demo` (`B524045`) | Student, 2nd year, Main Mess (Boys) |
| `riya@iiit-bh.demo` (`B525014`) | Student, 1st year, First-Year Mess |
| `staff.cpnb@iiit-bh.demo` | Mess staff, Coupon Mess (Boys). Also `staff.fy`, `staff.mainb`, `staff.maing`, `staff.cpng` |
| `society@iiit-bh.demo` | Mess society |
| `admin@iiit-bh.demo` | Admin (hostel office) |

The login page also has one-click demo buttons.

### Demo clock

The coupon window only opens on weekends, so the admin has a **Demo clock** page with one-click jumps: *Saturday 11:00* (window open), *next Monday 10:00* (grace period), *Wednesday* (closed), *today lunch* / *dinner* (check-in). A yellow banner shows whenever simulated time is on. "Back to real time" turns it off. The admin can also allow check-in outside meal hours so a live demo always works.

---

## 4. Deploy (Vercel + Turso, both free)

1. **Push to GitHub.** Create an empty repo, then in this folder:
   ```bash
   git init && git add . && git commit -m "CampusBite mess management"
   git branch -M main
   git remote add origin https://github.com/<you>/campusbite-mess.git
   git push -u origin main
   ```
2. **Create the database on Turso.** Sign up at turso.tech → *Create database* → copy the **database URL** (`libsql://...`) and create an **auth token**.
3. **Deploy on Vercel.** vercel.com → *Add New → Project* → import the repo. Under *Environment Variables* add:

   | Name | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | the `libsql://...` URL |
   | `TURSO_AUTH_TOKEN` | the token |
   | `JWT_SECRET` | any long random string |
   | `CHECKIN_SECRET` | another long random string |

   Click **Deploy**. The tables and demo data are created on the first visit.
4. Open `https://<your-app>.vercel.app/api/health`. It should show `{"ok":true,...}`. Then log in with a demo account.

Without the Turso variables the app still runs on Vercel using a temporary database in `/tmp`, but data is lost whenever Vercel restarts the server, so use Turso for the submitted link.

---

## 5. REST API

All routes are under `/api`. Errors come back as `{ "error": "message" }` with the matching HTTP status (400 rule broken, 401 not logged in, 403 wrong role, 404, 409 duplicate).

| Method & path | Who | Does |
| --- | --- | --- |
| `POST /auth/login` | public | Log in with email or roll number → sets the cookie |
| `POST /auth/logout` | anyone | Clears the cookie |
| `GET /auth/me` | logged in | Current user |
| `GET /home` | student | Home page data (current/next meal, today's menu, coupon status) |
| `GET /menu?unit=` · `PUT /menu` | logged in · staff | Weekly menu · edit own mess's menu |
| `GET /coupons/window` | coupon student | Window state, week, locked slots, prices, existing order |
| `POST /coupons/orders` | coupon student | Buy coupons `{ items: [{date, meal}] }` (all rules checked; one DB transaction) |
| `GET /coupons/late` · `POST /coupons/late` | coupon student | Today's meals for a late buy (price + ₹10, open / held / closed) · buy one `{ meal }` |
| `GET /coupons/me?week=` | coupon student | Wallet and transfer history |
| `POST /coupons/:id/transfer` | coupon student | Give a coupon `{ rollNo }` |
| `GET /exchange` | coupon student | Exchange board of your mess: for sale, wanted, your posts |
| `POST /exchange` | coupon student | Sell `{ kind: 'sell', couponId }` or ask `{ kind: 'request', date, meal }` |
| `POST /exchange/:id` · `DELETE /exchange/:id` | coupon student | Take a post (buy the coupon / sell yours to the asker) · cancel your own post |
| `POST /checkin` | student | Check in with the entrance code `{ code }` |
| `GET /checkin/code` | staff | Current code, meal, served count, recent check-ins |
| `POST /checkin/counter` | staff | Check in by roll number |
| `GET /headcount?unit=` | staff, society, admin | Cook-for counts, today and tomorrow |
| `GET /complaints` · `POST /complaints` | scoped by role · student | List · raise |
| `PATCH /complaints/:id` | staff, society, author | Change status with a reply/note |
| `POST /complaints/:id/metoo` | student | Toggle "me too" |
| `GET /notices` · `POST /notices` | scoped by role · staff, society, admin | List current, upcoming and recently ended notices · post one `{ title, body, kind, meal, messUnit, startsOn, endsOn, pinned }` |
| `DELETE /notices/:id` | author staff, society, admin | Delete a notice |
| `GET /overview` | society, admin | Every mess at a glance |
| `GET /admin/students` · `PATCH /admin/students/:id` | admin | List · change batch/gender/plan (mess recomputed) |
| `GET /admin/clock` · `PUT /admin/clock` | admin | Demo clock |
| `GET /health` | public | Health check |

---

## 6. Database

Defined in `lib/schema.js`; demo data in `lib/seed.js`.

| Table | Stores | Key constraint |
| --- | --- | --- |
| `mess_units` | The 5 messes | |
| `users` | Students, staff, society, admin | `email`, `roll_no` unique |
| `settings` | Prices, minimum days, demo clock | |
| `menu_items` | Weekly menu per mess | `(mess_unit, day, meal)` primary key |
| `coupon_orders` | One purchase per week | `UNIQUE(student_id, week_start)` |
| `coupons` | One row per meal coupon | `UNIQUE(student_id, date, meal)` |
| `late_purchases` | Late buys: the coupon, the ₹10 fee and the payment ref | coupon itself is in `coupons` with `order_id` NULL |
| `transfers` | Coupon transfer history | |
| `exchange_posts` | Coupon exchange: coupons on sale and requests for a meal | partial `UNIQUE` indexes: a coupon is on sale once; one open request per student per meal |
| `checkins` | Who ate when | `UNIQUE(student_id, date, meal)` (no double check-in) |
| `complaints`, `complaint_history`, `complaint_metoo` | Complaints, status timeline, votes | |
| `notices` | Notice board: special meals, veg-only days, menu/timing changes, service issues | `CHECK(ends_on >= starts_on)`; `mess_unit` NULL = every mess |

**Concurrency-safe updates.** Using a coupon is a single conditional update, so two scans at the same moment can't both succeed:

```sql
UPDATE coupons SET status = 'used', used_at = ?
 WHERE student_id = ? AND date = ? AND meal = ? AND status = 'unused';
-- 0 rows changed → no coupon, or already used
```

Buying (order + all its coupons) and transferring (move coupon + log it) each run inside a **transaction**.

---

## 7. Project structure

```
app/
  login/page.js              landing + login: hero, how it works, demo buttons, meal-time footer
  (app)/layout.js            shared shell (sidebar / bottom nav)
  (app)/home, menu, coupons, coupons/review, coupons/wallet, coupons/exchange, checkin, complaints, notices
  (app)/staff/screen, staff/counter, staff/headcount, staff/menu
  (app)/society
  (app)/admin/students, admin/clock
  api/**/route.js            REST API (Node.js)
components/                  AppShell, UI pieces, WindowBanner, HeadcountView, NoticeCard, LateBuyCard
lib/
  constants.js               meals, prices, messes, roles
  clock.js                   IST date helpers
  couponRules.js             window, grace, minimum (pure functions)
  messAllocation.js          batch + plan + gender → mess
  checkinCode.js             rotating HMAC code
  checkin.js                 check-in rules and headcount
  exchange.js                coupon exchange rules and the atomic trade
  auth.js                    JWT cookie, role checks, error handling
  db.js, schema.js, seed.js  database connection, tables, demo data
store/                       Redux store, slices, RTK Query API
middleware.js                page access by role
```

## 8. Not built yet (next steps)

Mess-society hygiene inspections with scores, meal ratings, skipping a meal in advance, menu approval by the society, an admin price editor, real payment gateway, and charts of attendance over time.
