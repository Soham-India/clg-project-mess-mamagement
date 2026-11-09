'use client';
// "Need a meal today?": buy a single coupon for one of today's meals at price + late fee,
// until 1 hour before the meal starts. Shown on the Buy coupons page.
import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { Clock3, CheckCircle2, Lock, CreditCard } from 'lucide-react';
import { useLateBuyQuery, useBuyLateMutation, errorText } from '@/store/api';
import { toastAdded } from '@/store/uiSlice';
import { mealLabel } from '@/lib/constants';
import { Loading, ErrorBox, Badge, Countdown, Modal } from './ui';

const hhmm = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

export default function LateBuyCard() {
  const { data, isLoading, error } = useLateBuyQuery(undefined, { pollingInterval: 60000 });
  const [buying, setBuying] = useState(null);

  if (isLoading) return <div className="card" style={{ marginBottom: 18 }}><Loading /></div>;
  if (error) return <div style={{ marginBottom: 18 }}><ErrorBox error={error} /></div>;

  return (
    <section className="card" id="late" style={{ marginBottom: 18 }}>
      <div className="card-head" style={{ flexWrap: 'wrap' }}>
        <div className="card-title"><Clock3 size={18} /> Need a meal today?</div>
        <span className="small muted">
          Buy one of today&apos;s meals for its price + ₹{data.fee}, up to {data.cutoffMin / 60} hour before it starts.
        </span>
      </div>
      <div className="grid grid-3" style={{ gap: 10 }}>
        {data.options.map((o) => (
          <div key={o.meal} className={`coupon ${o.state === 'open' ? 'upcoming' : 'used'}`} style={{ alignItems: 'center' }}>
            <div>
              <div className="c-meal">{mealLabel(o.meal)} <span className="tiny muted">at {o.start}</span></div>
              {o.state === 'held' && <div className="tiny muted">You have this meal</div>}
              {o.state === 'closed' && <div className="tiny muted">Closed at {hhmm(o.closesAt)}</div>}
              {o.state === 'open' && (
                <div className="tiny muted">
                  ₹{o.price} + ₹{o.fee} · buy within <Countdown target={o.closesAt} serverNow={data.now} />
                </div>
              )}
            </div>
            {o.state === 'held' && <CheckCircle2 size={18} color="var(--ok)" aria-label="You have this meal" />}
            {o.state === 'closed' && <Lock size={16} color="var(--faint)" aria-label="Closed" />}
            {o.state === 'open' && (
              <button className="btn btn-primary btn-sm" onClick={() => setBuying(o)}>Buy ₹{o.total}</button>
            )}
          </div>
        ))}
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        Missed it? Ask for the meal on the <Link href="/coupons/exchange" className="bold" style={{ color: 'var(--brand)' }}>coupon exchange</Link>; someone may sell you theirs at the normal price.
      </p>
      {buying && <ConfirmLateBuy option={buying} onClose={() => setBuying(null)} />}
    </section>
  );
}

function ConfirmLateBuy({ option, onClose }) {
  const dispatch = useDispatch();
  const [buy, { isLoading, error }] = useBuyLateMutation();
  const pay = async () => {
    const res = await buy({ meal: option.meal });
    if (res.data) {
      dispatch(toastAdded(res.data.message));
      onClose();
    }
  };
  return (
    <Modal title={`Buy today's ${mealLabel(option.meal).toLowerCase()}`} onClose={onClose}>
      <div className="stack">
        <div className="card card-tight" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="summary-line"><span className="muted">{mealLabel(option.meal)} today, {option.start}</span><span>₹{option.price}</span></div>
          <div className="summary-line"><span className="muted">Late fee</span><span>₹{option.fee}</span></div>
          <div className="summary-total"><span className="muted bold">Total</span><b>₹{option.total}</b></div>
        </div>
        <Badge tone="warn">Valid only for today&apos;s {mealLabel(option.meal).toLowerCase()}. No refund if unused.</Badge>
        {error && <ErrorBox>{errorText(error)}</ErrorBox>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={isLoading} onClick={pay}>
            <CreditCard size={16} /> {isLoading ? 'Processing…' : `Pay ₹${option.total}`}
          </button>
        </div>
        <p className="tiny muted">Demo payment: no real money is charged.</p>
      </div>
    </Modal>
  );
}
