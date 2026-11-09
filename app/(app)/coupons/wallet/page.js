'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { ChevronLeft, ChevronRight, Send, Ticket, ArrowDownLeft, ArrowUpRight, Tag, ArrowLeftRight } from 'lucide-react';
import { useWalletQuery, useTransferCouponMutation, errorText } from '@/store/api';
import { toastAdded } from '@/store/uiSlice';
import { mealLabel } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge, Empty, Modal } from '@/components/ui';

const fmtDay = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const STATE = { upcoming: ['Ready', 'ok'], used: ['Used', undefined], expired: ['Expired', 'bad'] };

export default function WalletPage() {
  const [week, setWeek] = useState(null);
  const { data, isLoading, isFetching, error } = useWalletQuery(week ?? undefined);
  const [giving, setGiving] = useState(null);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const dates = [...new Set(data.coupons.map((c) => c.date))];
  const label = data.week === data.thisWeek ? 'This week' : data.week > data.thisWeek ? 'Next week' : 'Past week';

  return (
    <>
      <PageHeader title="My coupons" sub="Show up and check in; each coupon is used automatically for that meal.">
        <Link href="/coupons/exchange" className="btn btn-sm"><ArrowLeftRight size={16} /> Coupon exchange</Link>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setWeek(data.prevWeek)} aria-label="Previous week"><ChevronLeft size={16} /></button>
          <span className="bold small" style={{ minWidth: 150, textAlign: 'center' }}>{label} · {fmtDay(data.week)}</span>
          <button className="btn btn-sm" onClick={() => setWeek(data.nextWeek)} aria-label="Next week"><ChevronRight size={16} /></button>
        </div>
      </PageHeader>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat label="Coupons" value={data.summary.total} />
        <Stat label="Ready to use" value={data.summary.upcoming} />
        <Stat label="Used" value={data.summary.used} />
        <Stat label="Expired (no refund)" value={data.summary.expired} />
      </div>

      <div className="grid grid-3" style={{ opacity: isFetching ? 0.6 : 1 }}>
        <div className="card span-2">
          {dates.length === 0 ? (
            <Empty icon={Ticket} title="No coupons this week">
              {data.week > data.thisWeek ? <Link href="/coupons" className="bold" style={{ color: 'var(--brand)' }}>Buy coupons for next week</Link> : 'Coupons you buy or receive show up here.'}
            </Empty>
          ) : (
            <div className="stack">
              {dates.map((date) => (
                <div key={date}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <b>{fmtDay(date)}</b>
                    {date === data.today && <Badge tone="warn">Today</Badge>}
                  </div>
                  <div className="grid grid-3" style={{ gap: 8 }}>
                    {data.coupons.filter((c) => c.date === date).map((c) => (
                      <div key={c.id} className={`coupon ${c.state}`}>
                        <div>
                          <div className="c-meal">{mealLabel(c.meal)}</div>
                          <div className="tiny muted">₹{c.price}{c.lateFee ? ` + ₹${c.lateFee} late` : ''}{c.receivedFrom ? ` · from ${c.receivedFrom}` : ''}</div>
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          {c.onSale ? <Badge tone="warn">On sale</Badge> : <Badge tone={STATE[c.state][1]}>{STATE[c.state][0]}</Badge>}
                          {c.transferable && !c.onSale && (
                            <Link href={`/coupons/exchange?sell=${c.id}`} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} aria-label={`Sell ${mealLabel(c.meal)} on ${c.date} on the exchange`} title="Sell on the exchange">
                              <Tag size={15} />
                            </Link>
                          )}
                          {c.transferable && (
                            <button className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} onClick={() => setGiving(c)} aria-label={`Give ${mealLabel(c.meal)} on ${c.date} to a friend`} title="Give to a friend">
                              <Send size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Transfers</div>
          {data.transfers.length === 0 ? (
            <p className="small muted">Can&apos;t make a meal? Tap the send icon to give a coupon to a friend in your mess, or the tag icon to sell it to anyone in your mess on the <Link href="/coupons/exchange" className="bold" style={{ color: 'var(--brand)' }}>coupon exchange</Link>.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {data.transfers.map((t, i) => (
                <div key={i} className="row small" style={{ alignItems: 'flex-start' }}>
                  {t.direction === 'sent' ? <ArrowUpRight size={16} color="var(--bad)" /> : <ArrowDownLeft size={16} color="var(--ok)" />}
                  <div>
                    <div><b>{t.direction === 'sent' ? `To ${t.to_name}` : `From ${t.from_name}`}</b></div>
                    <div className="muted tiny">{mealLabel(t.meal)} · {fmtDay(t.date)}{t.price != null ? ` · ${t.direction === 'sent' ? 'sold' : 'bought'} for ₹${t.price}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {giving && <TransferModal coupon={giving} onClose={() => setGiving(null)} />}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card card-tight">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function TransferModal({ coupon, onClose }) {
  const dispatch = useDispatch();
  const [rollNo, setRollNo] = useState('');
  const [transfer, { isLoading, error }] = useTransferCouponMutation();
  const submit = async (e) => {
    e.preventDefault();
    const res = await transfer({ id: coupon.id, rollNo });
    if (res.data) {
      dispatch(toastAdded(`${mealLabel(coupon.meal)} coupon sent to ${res.data.to.name}.`));
      onClose();
    }
  };
  return (
    <Modal title="Give coupon to a friend" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="card card-tight" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
          <b>{mealLabel(coupon.meal)}</b> · {fmtDay(coupon.date)} · ₹{coupon.price}
        </div>
        <label className="field">
          <span className="label">Friend&apos;s roll number</span>
          <input className="input" value={rollNo} onChange={(e) => setRollNo(e.target.value.toUpperCase())} placeholder="e.g. B522033" autoFocus required />
          <span className="hint">They must eat at the same mess. This can&apos;t be undone.</span>
        </label>
        {error && <ErrorBox>{errorText(error)}</ErrorBox>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={isLoading || !rollNo}><Send size={16} /> {isLoading ? 'Sending…' : 'Send coupon'}</button>
        </div>
      </form>
    </Modal>
  );
}
