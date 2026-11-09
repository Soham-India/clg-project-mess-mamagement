'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Ticket, ScanLine, ShieldCheck } from 'lucide-react';
import { useLoginMutation, errorText } from '@/store/api';
import { ROLE_HOME } from '@/lib/constants';
import { Logo, PlateArt, ErrorBox } from '@/components/ui';

const DEMOS = [
  { group: 'Students', items: [
    { email: 'aman@iiit-bh.demo', name: 'Aman Verma', note: '3rd yr · Coupon plan · Boys' },
    { email: 'neha@iiit-bh.demo', name: 'Neha Singh', note: '3rd yr · Coupon plan · Girls' },
    { email: 'priya@iiit-bh.demo', name: 'Priya Nayak', note: '3rd yr · Fixed plan · Main mess' },
    { email: 'riya@iiit-bh.demo', name: 'Riya Patnaik', note: '1st yr · First-Year mess' },
  ] },
  { group: 'Staff and office', items: [
    { email: 'staff.cpnb@iiit-bh.demo', name: 'Mess staff', note: 'Coupon Mess (Boys)' },
    { email: 'society@iiit-bh.demo', name: 'Mess society', note: 'Inspects all messes' },
    { email: 'admin@iiit-bh.demo', name: 'Admin', note: 'Hostel office' },
  ] },
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
    <div className="login">
      <section className="login-art">
        <div className="row"><Logo size={40} /><span className="brand-name" style={{ fontSize: 22 }}>Thali</span></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>Every meal at IIIT Bhubaneswar, sorted.</h1>
          <p>Weekly menus, coupons bought in a minute, quick check-in at the counter, and complaints that reach someone who can fix them.</p>
          <div className="stack art-foot" style={{ marginTop: 28, gap: 10, opacity: 0.9 }}>
            <div className="row"><Ticket size={18} /> Day-specific coupons with the ₹476 weekly minimum</div>
            <div className="row"><ScanLine size={18} /> Rotating entrance code stops proxy check-ins</div>
            <div className="row"><ShieldCheck size={18} /> Mess society tracks and escalates issues</div>
          </div>
        </div>
        <div style={{ position: 'absolute', right: -70, bottom: -70, opacity: 0.12 }}><PlateArt size={380} /></div>
        <div className="small art-foot" style={{ opacity: 0.7 }}>IWT course project · Next.js, Redux, Node.js API, SQLite</div>
      </section>

      <section className="login-form">
        <div className="login-box stack" style={{ gap: 20 }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800 }}>Log in</h2>
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

          <div className="divider" />
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <div className="bold">Try a demo account</div>
              <div className="small muted">One click logs you in. Password for all: <span className="mono">demo1234</span></div>
            </div>
            {DEMOS.map((g) => (
              <div key={g.group} className="demo-group">
                <div className="tiny muted bold" style={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>{g.group}</div>
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
    </div>
  );
}
