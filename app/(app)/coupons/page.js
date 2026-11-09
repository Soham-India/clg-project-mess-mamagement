'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Copy, Sun, Utensils, Eraser, ArrowRight, Wallet, Lock } from 'lucide-react';
import { useCouponWindowQuery } from '@/store/api';
import { setWeek, toggleSlot, applyPreset, clearPlanner, selectSelected, selectItems } from '@/store/plannerSlice';
import { totalOf, shortfallHint, slotKey } from '@/lib/couponRules';
import { MEALS, DAYS_SHORT } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge } from '@/components/ui';
import WindowBanner from '@/components/WindowBanner';

const dayNum = (date) => Number(date.slice(8));
const monthShort = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });

export default function CouponPlanner() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: win, isLoading, error } = useCouponWindowQuery(undefined, { refetchOnMountOrArgChange: true });
  const selected = useSelector(selectSelected);
  const items = useSelector(selectItems);

  useEffect(() => {
    if (win) dispatch(setWeek(win.weekStart));
  }, [win, dispatch]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  if (win.order) {
    const byMeal = MEALS.map((m) => win.order.items.filter((i) => i.meal === m.key).length);
    return (
      <>
        <PageHeader title="Buy coupons" sub="Plan the meals you'll eat next week and buy them in one go." />
        <WindowBanner win={win} />
        <div className="card stack" style={{ maxWidth: 560 }}>
          <Badge tone="ok" dot>Already bought for this week</Badge>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>₹{win.order.total} · {win.order.items.length} coupons</h2>
          <p className="muted small">
            {byMeal[0]} breakfasts, {byMeal[1]} lunches, {byMeal[2]} dinners. Payment ref <span className="mono">{win.order.payment_ref}</span>.
            You can buy once per week; to give a meal to a friend, transfer the coupon from your wallet.
          </p>
          <Link href="/coupons/wallet" className="btn btn-primary"><Wallet size={18} /> Open my coupons</Link>
        </div>
      </>
    );
  }

  const total = totalOf(items, win.prices);
  const pct = Math.min(100, (total / win.minTotal) * 100);
  const hint = shortfallHint(total, win);
  const counts = MEALS.map((m) => ({ ...m, n: items.filter((i) => i.meal === m.key).length }));
  const closed = win.state === 'closed';
  const canReview = !closed && total >= win.minTotal;
  const preset = (p) => dispatch(applyPreset({ preset: p, dates: win.dates, locked: win.locked, items: win.lastWeek }));

  return (
    <>
      <PageHeader title="Buy coupons" sub={`Tick the meals you'll eat. Minimum ₹${win.minTotal} (${win.minDays} days' worth) in any mix.`} />
      <WindowBanner win={win} />

      <div className="planner">
        <div className="card">
          <div className="row-wrap" style={{ marginBottom: 16 }}>
            <span className="small bold muted" style={{ marginRight: 4 }}>Quick fill</span>
            <button className="btn btn-sm" onClick={() => preset('lastWeek')} disabled={!win.lastWeek.length} title={win.lastWeek.length ? '' : 'No coupons last week'}>
              <Copy size={14} /> Copy last week
            </button>
            <button className="btn btn-sm" onClick={() => preset('lunchDinner')}><Utensils size={14} /> Lunch + dinner daily</button>
            <button className="btn btn-sm" onClick={() => preset('weekdays')}><Sun size={14} /> Weekdays, all meals</button>
            <button className="btn btn-sm" onClick={() => preset('full')}><Check size={14} /> Full week</button>
            <button className="btn btn-sm btn-ghost" onClick={() => dispatch(clearPlanner())} disabled={!items.length}><Eraser size={14} /> Clear</button>
          </div>

          <div className="week-grid" role="grid" aria-label="Meals for the week">
            <div />
            {MEALS.map((m) => (
              <div key={m.key} className="gh">{m.label} <span className="faint">₹{win.prices[m.key]}</span></div>
            ))}
            {win.dates.map((date, d) => (
              <Row key={date} date={date} d={d} win={win} selected={selected} dispatch={dispatch} />
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 12 }}>Each coupon is valid only for that meal on that date. Veg and non-veg cost the same.</p>
        </div>

        <aside className="card summary stack">
          <div className="card-title">Your week</div>
          <div>
            {counts.map((m) => (
              <div key={m.key} className="summary-line">
                <span className="muted">{m.label} × {m.n}</span>
                <span>₹{m.n * win.prices[m.key]}</span>
              </div>
            ))}
          </div>
          <div className="summary-total"><span className="muted bold">Total</span><b>₹{total}</b></div>
          <div className="stack" style={{ gap: 6 }}>
            <div className={`progress ${total >= win.minTotal ? '' : 'warn'}`} aria-label="Progress toward minimum">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="row between tiny muted"><span>Minimum ₹{win.minTotal}</span><span>Max ₹{win.maxTotal}</span></div>
          </div>
          {hint ? <div className="small bold" style={{ color: 'var(--warn)' }}>{hint}</div> : <div className="small bold" style={{ color: 'var(--ok)' }}>Minimum reached.</div>}
          <button className="btn btn-primary btn-lg" disabled={!canReview} onClick={() => router.push('/coupons/review')}>
            {closed ? <><Lock size={16} /> Opens Saturday</> : <>Review and pay <ArrowRight size={18} /></>}
          </button>
          <p className="tiny muted">Unused coupons are not refunded. You can transfer one to a friend in your mess before the meal starts.</p>
        </aside>
      </div>
    </>
  );
}

function Row({ date, d, win, selected, dispatch }) {
  return (
    <>
      <div className="day">
        <b>{DAYS_SHORT[d]}</b>
        <span className="tiny muted">{dayNum(date)} {monthShort(date)}</span>
      </div>
      {MEALS.map((m) => {
        const k = slotKey(date, m.key);
        const locked = win.locked.includes(k);
        const on = Boolean(selected[k]);
        return (
          <button
            key={m.key}
            className={`slot ${on ? 'on' : ''}`}
            disabled={locked}
            aria-pressed={on}
            aria-label={`${m.label} on ${date}${locked ? ', locked' : ''}`}
            onClick={() => dispatch(toggleSlot({ date, meal: m.key }))}
          >
            <span className="slot-label">{locked ? 'Started' : on ? 'Selected' : 'Add'}</span>
            <span className="price">₹{win.prices[m.key]}</span>
            {!locked && <span className="tick">{on && <Check size={13} strokeWidth={3} />}</span>}
            {locked && <Lock size={15} />}
          </button>
        );
      })}
    </>
  );
}
