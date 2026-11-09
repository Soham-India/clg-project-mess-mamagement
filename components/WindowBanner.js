'use client';
import { CalendarClock, Hourglass, Lock } from 'lucide-react';
import { Countdown } from './ui';

const fmt = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Shows whether the coupon window is open, in grace, or closed, with a live countdown. */
export default function WindowBanner({ win }) {
  const range = `${fmt(win.dates[0])} – ${fmt(win.dates[6])}`;
  if (win.state === 'open') {
    return (
      <div className="window-banner open">
        <CalendarClock size={22} />
        <div style={{ flex: 1 }}>
          <div className="wb-title">Buying window open for {range}</div>
          <div className="small">Closes Sunday 11:59 PM. Late purchases are still accepted on Monday until dinner.</div>
        </div>
        <div className="bold">Closes in <Countdown target={win.closesAt} serverNow={win.now} /></div>
      </div>
    );
  }
  if (win.state === 'grace') {
    return (
      <div className="window-banner grace">
        <Hourglass size={22} />
        <div style={{ flex: 1 }}>
          <div className="wb-title">Grace period: last chance for {range}</div>
          <div className="small">The window closed on Sunday. Today&apos;s meals that have already started are locked.</div>
        </div>
        <div className="bold">Ends at dinner · <Countdown target={win.closesAt} serverNow={win.now} /></div>
      </div>
    );
  }
  return (
    <div className="window-banner closed">
      <Lock size={22} />
      <div style={{ flex: 1 }}>
        <div className="wb-title">Window closed</div>
        <div className="small">Coupons for {range} go on sale Saturday at 12:00 AM. You can plan now and buy then.</div>
      </div>
      <div className="bold">Opens in <Countdown target={win.opensAt} serverNow={win.now} /></div>
    </div>
  );
}
