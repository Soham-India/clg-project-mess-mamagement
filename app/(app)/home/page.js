'use client';
import Link from 'next/link';
import { Ticket, ScanLine, CheckCircle2, Circle, ArrowRight, MapPin } from 'lucide-react';
import { useHomeQuery } from '@/store/api';
import { MEALS } from '@/lib/constants';
import { Loading, ErrorBox, Countdown, Badge, ThaliPlate } from '@/components/ui';

const fmtDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const greeting = (date) => {
  const h = new Date(date + 19800000).getUTCHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function StudentHome() {
  const { data, isLoading, error } = useHomeQuery(undefined, { pollingInterval: 60000 });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const c = data.coupons;
  const heroMeal = data.serving ?? data.next;
  const heroItems = data.todayMenu[heroMeal.key];
  const nextIsTomorrow = !data.serving && data.next.date !== data.date;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">{greeting(data.now)}</h1>
          <p className="page-sub row" style={{ gap: 6 }}><MapPin size={15} /> {data.messUnitName}</p>
        </div>
        <Link href="/checkin" className="btn btn-primary"><ScanLine size={18} /> Check in</Link>
      </div>

      <section className="hero torn-bottom">
        <div className="plate"><ThaliPlate size={230} label="" /></div>
        <div className="eyebrow">
          {data.serving ? `Now serving, until ${data.serving.end}` : `Next up ${nextIsTomorrow ? 'tomorrow ' : ''}at ${data.next.start}`}
        </div>
        <h2>{heroMeal.label}</h2>
        {!nextIsTomorrow && heroItems && <p className="items">{heroItems}</p>}
        {!data.serving && (
          <p className="items" style={{ marginTop: 14 }}>
            Starts in <Countdown target={data.next.startsAt} serverNow={data.now} />
          </p>
        )}
      </section>

      <div className="grid grid-3">
        <div className="card span-2">
          <div className="card-head">
            <div className="card-title">Today&apos;s menu</div>
            <Link href="/menu" className="small bold" style={{ color: 'var(--brand)' }}>Full week</Link>
          </div>
          <div className="meal-row">
            {MEALS.map((m) => {
              const done = data.checkedIn.includes(m.key);
              const coupon = c?.today.find((x) => x.meal === m.key);
              return (
                <div key={m.key} className={`meal-tile ${data.serving?.key === m.key ? 'now' : ''}`}>
                  <div className="row between">
                    <span className="meal-name">{m.label}</span>
                    {done ? <CheckCircle2 size={16} color="var(--ok)" aria-label="Checked in" /> : <Circle size={16} color="var(--line-strong)" />}
                  </div>
                  <div className="meal-time">{m.start}–{m.end}</div>
                  <div className="meal-items">{data.todayMenu[m.key]}</div>
                  {c && (
                    <div style={{ marginTop: 8 }}>
                      {coupon ? (
                        <Badge tone={coupon.status === 'used' ? undefined : 'ok'}>{coupon.status === 'used' ? 'Coupon used' : 'Coupon ready'}</Badge>
                      ) : (
                        <Badge tone="bad">No coupon</Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {c ? (
          <div className="card stack">
            <div className="card-title"><Ticket size={18} /> Coupons</div>
            {c.window.state === 'closed' ? (
              <>
                <Badge>Window closed</Badge>
                <p className="small muted">Next week&apos;s window opens Saturday. Opens in <b><Countdown target={c.window.opensAt} serverNow={data.now} /></b></p>
              </>
            ) : c.boughtForWindowWeek ? (
              <>
                <Badge tone="ok" dot>Bought for week of {fmtDate(c.window.weekStart)}</Badge>
                <p className="small muted">You spent ₹{c.boughtForWindowWeek}. Unused coupons are not refunded.</p>
              </>
            ) : (
              <>
                <Badge tone={c.window.state === 'grace' ? 'warn' : 'ok'} dot>{c.window.state === 'grace' ? 'Grace period' : 'Window open'}</Badge>
                <p className="small muted">Buy for the week of {fmtDate(c.window.weekStart)}. Closes in <b><Countdown target={c.window.closesAt} serverNow={data.now} /></b></p>
                <Link href="/coupons" className="btn btn-accent btn-sm">Buy coupons <ArrowRight size={15} /></Link>
              </>
            )}
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row between small"><span className="muted">This week</span><b>{c.week.used} of {c.week.total} used</b></div>
            <div className="progress"><span style={{ width: `${c.week.total ? (c.week.used / c.week.total) * 100 : 0}%` }} /></div>
            <Link href="/coupons/wallet" className="small bold" style={{ color: 'var(--brand)' }}>Open my coupons</Link>
          </div>
        ) : (
          <div className="card stack">
            <div className="card-title">Fixed plan</div>
            <p className="small muted">Your mess fee is part of the semester fee, so there&apos;s nothing to buy. Check in at {data.messUnitName} at each meal.</p>
            <Badge tone="brand">{data.checkedIn.length} of 3 meals today</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
