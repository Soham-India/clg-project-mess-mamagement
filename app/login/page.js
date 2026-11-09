'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Ticket, ScanLine, ShieldCheck } from 'lucide-react';
import { useLoginMutation, errorText } from '@/store/api';
import { ROLE_HOME, MEALS, DEFAULT_PRICES } from '@/lib/constants';
import { Logo, ThaliPlate, Chillies, ErrorBox } from '@/components/ui';

const DEMOS = [
  { group: 'Students', items: [
    { email: 'aman@iiit-bh.demo', name: 'Aman Verma', note: '3rd yr, coupon plan, boys' },
    { email: 'neha@iiit-bh.demo', name: 'Neha Singh', note: '3rd yr, coupon plan, girls' },
    { email: 'priya@iiit-bh.demo', name: 'Priya Nayak', note: '3rd yr, fixed plan, main mess' },
    { email: 'riya@iiit-bh.demo', name: 'Riya Patnaik', note: '1st yr, first-year mess' },
  ] },
  { group: 'Staff and office', items: [
    { email: 'staff.cpnb@iiit-bh.demo', name: 'Mess staff', note: 'Coupon Mess (Boys)' },
    { email: 'society@iiit-bh.demo', name: 'Mess society', note: 'Inspects all messes' },
    { email: 'admin@iiit-bh.demo', name: 'Admin', note: 'Hostel office' },
  ] },
];

const MEAL_DOT = { breakfast: '#f2b632', lunch: '#d4573a', dinner: '#f5e8cc' };

const FEATURES = [
  { icon: Ticket, title: 'Coupons by the day', text: 'Pick only the meals you will eat next week. Minimum ₹476, bought in a minute.' },
  { icon: ScanLine, title: 'Check in at the counter', text: 'Scan the entrance code. It changes every 30 seconds, so no proxy check-ins.' },
  { icon: ShieldCheck, title: 'Complaints that get fixed', text: 'Mess staff reply, and the mess society steps in when they do not.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading, error }] = useLoginMutation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (id, pw) => {
    const res = await login({ identifier: id, password: pw });
    if (res.data) router.replace(ROLE_HOME[res.data.user.role]);
  };

  return (
    <div>
      <section className="lp-hero torn-bottom">
        <div className="lp-wrap">
          <header className="lp-nav">
            <div className="row">
              <Logo size={40} />
              <div>
                <div className="brand-name">Thali</div>
                <div className="brand-sub">IIIT Bhubaneswar Mess</div>
              </div>
            </div>
            <nav aria-label="Page">
              <a href="#how">How it works</a>
              <a href="#timings">Meal times</a>
              <a href="#login">Log in</a>
            </nav>
          </header>

          <div className="lp-hero-grid">
            <div>
              <h1 className="lp-title">Every meal at IIIT Bhubaneswar, sorted.</h1>
              <p className="lp-lede">See this week&apos;s menu, buy coupons for the days you&apos;ll eat, and check in at the counter in seconds.</p>
              <div className="lp-times">
                {MEALS.map((m) => (
                  <span key={m.key} className="lp-time">
                    <i style={{ background: MEAL_DOT[m.key] }} /> {m.label} {m.start}
                  </span>
                ))}
              </div>
              <a href="#login" className="btn btn-primary btn-lg">Log in to your mess <ArrowRight size={18} /></a>
            </div>
            <div className="lp-plate"><ThaliPlate size={470} /></div>
          </div>
        </div>
        <div className="lp-chillies"><Chillies size={96} /></div>
      </section>

      <section className="lp-wrap lp-body">
        <div className="lp-about" id="how">
          <h2>One plate, three meals, no paper slips.</h2>
          <div className="rule" />
          <div className="stack" style={{ gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="lp-feature">
                <span className="ic"><Icon size={20} /></span>
                <div>
                  <b>{title}</b>
                  <span className="muted">{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card lp-login stack" id="login" style={{ gap: 20 }}>
          <div>
            <h2>Log in</h2>
            <p className="muted" style={{ marginTop: 4 }}>Use your institute email or roll number.</p>
          </div>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              submit(identifier, password);
            }}
          >
            <label className="field">
              <span className="label">Email or roll number</span>
              <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="B523052 or name@iiit-bh.demo" autoComplete="username" required />
            </label>
            <label className="field">
              <span className="label">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            {error && <ErrorBox>{errorText(error)}</ErrorBox>}
            <button className="btn btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Logging in…' : 'Log in'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="divider" style={{ margin: 0 }} />
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <div className="bold">Try a demo account</div>
              <div className="small muted">One click logs you in. Password for all: <span className="mono">demo1234</span></div>
            </div>
            {DEMOS.map((g) => (
              <div key={g.group} className="demo-group">
                <div className="demo-group-name">{g.group}</div>
                {g.items.map((d) => (
                  <button key={d.email} type="button" className="demo-btn" disabled={isLoading} onClick={() => submit(d.email, 'demo1234')}>
                    <span>
                      <span className="bold" style={{ display: 'block', fontSize: 14 }}>{d.name}</span>
                      <span className="small muted">{d.note}</span>
                    </span>
                    <ArrowRight size={16} className="muted" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="lp-foot torn-top" id="timings">
        <div className="lp-wrap">
          <div className="lp-foot-grid">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Logo size={36} />
              <div>
                <div className="brand-name" style={{ fontSize: 22 }}>Thali</div>
                <div className="meta" style={{ marginTop: 4 }}>Five messes, one app.<br />IIIT Bhubaneswar.</div>
              </div>
            </div>
            {MEALS.map((m) => (
              <div key={m.key}>
                <h3>{m.label}</h3>
                <div className="meta">{m.start}–{m.end}</div>
                <div className="meta">₹{DEFAULT_PRICES[m.key]} a coupon</div>
              </div>
            ))}
            <a href="#login" className="btn btn-primary">Log in</a>
          </div>
          <div className="lp-foot-base">IWT course project by Soham Mishra (B423063). Next.js, Redux, Node.js API, SQLite.</div>
        </div>
      </footer>
    </div>
  );
}
