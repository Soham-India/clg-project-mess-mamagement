'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, CreditCard, PartyPopper, Wallet, AlertTriangle } from 'lucide-react';
import { useCouponWindowQuery, usePlaceOrderMutation, errorText } from '@/store/api';
import { selectItems, clearPlanner } from '@/store/plannerSlice';
import { totalOf } from '@/lib/couponRules';
import { MEALS, mealLabel } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge } from '@/components/ui';

const fmtDay = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function ReviewPage() {
  const dispatch = useDispatch();
  const items = useSelector(selectItems);
  const { data: win, isLoading } = useCouponWindowQuery();
  const [placeOrder, { isLoading: paying, error }] = usePlaceOrderMutation();
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(null);

  if (isLoading) return <Loading />;

  if (done) {
    return (
      <div className="card stack fade-in" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', alignItems: 'center' }}>
        <div className="result-icon" style={{ background: 'var(--ok)', margin: '0 auto' }}><PartyPopper size={26} /></div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Coupons bought</h2>
        <p className="muted">{done.count} coupons for the week of {done.weekStart}. Paid ₹{done.total}.</p>
        <p className="small">Payment reference <span className="mono bold">{done.paymentRef}</span></p>
        <Link href="/coupons/wallet" className="btn btn-primary"><Wallet size={18} /> Open my coupons</Link>
      </div>
    );
  }

  if (!items.length) {
    return (
      <>
        <PageHeader title="Review and pay" />
        <div className="card stack" style={{ maxWidth: 520 }}>
          <p>You haven&apos;t picked any meals yet.</p>
          <Link href="/coupons" className="btn"><ArrowLeft size={16} /> Back to planner</Link>
        </div>
      </>
    );
  }

  const total = totalOf(items, win.prices);
  const days = [...new Set(items.map((i) => i.date))];

  const pay = async () => {
    const res = await placeOrder(items);
    if (res.data) {
      setDone(res.data);
      dispatch(clearPlanner());
    }
  };

  return (
    <>
      <PageHeader title="Review and pay" sub="Check your meals before paying. Coupons are valid only for the meal and date shown.">
        <Link href="/coupons" className="btn"><ArrowLeft size={16} /> Edit</Link>
      </PageHeader>
      <div className="planner">
        <div className="card">
          {days.map((date) => (
            <div key={date} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <b>{fmtDay(date)}</b>
              <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
                {items.filter((i) => i.date === date).map((i) => (
                  <Badge key={i.meal} tone="brand">{mealLabel(i.meal)} ₹{win.prices[i.meal]}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        <aside className="card summary stack">
          <div className="card-title">Payment</div>
          {MEALS.map((m) => {
            const n = items.filter((i) => i.meal === m.key).length;
            return (
              <div key={m.key} className="summary-line"><span className="muted">{m.label} × {n}</span><span>₹{n * win.prices[m.key]}</span></div>
            );
          })}
          <div className="summary-total"><span className="muted bold">Total</span><b>₹{total}</b></div>
          <div className="row small" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: 10, borderRadius: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Unused coupons are <b>not refunded</b>. If you can&apos;t make a meal, transfer the coupon to a friend in your mess.</span>
          </div>
          <label className="check">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I understand unused coupons are not refunded.
          </label>
          {error && <ErrorBox>{errorText(error)}</ErrorBox>}
          <button className="btn btn-primary btn-lg" disabled={!agreed || paying} onClick={pay}>
            <CreditCard size={18} /> {paying ? 'Processing…' : `Pay ₹${total}`}
          </button>
          <p className="tiny muted">Demo payment: no real money is charged.</p>
        </aside>
      </div>
    </>
  );
}
