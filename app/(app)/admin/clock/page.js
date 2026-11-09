'use client';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { CalendarClock, Hourglass, Utensils, Moon, Lock, RotateCcw } from 'lucide-react';
import { useClockQuery, useSetClockMutation, errorText } from '@/store/api';
import { toastAdded } from '@/store/uiSlice';
import { DAYS } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge, useServerNow } from '@/components/ui';
import { ist } from '@/lib/clock';

const PRESETS = [
  { key: 'saturday', icon: CalendarClock, title: 'Saturday 11:00 AM', text: 'Coupon window open: buy for next week.' },
  { key: 'grace', icon: Hourglass, title: 'Next Monday 10:00 AM', text: 'Grace period: breakfast locked, rest still buyable.' },
  { key: 'closed', icon: Lock, title: 'Wednesday 4:00 PM', text: 'Window closed: the planner is read only.' },
  { key: 'lunch', icon: Utensils, title: 'Today 12:30 PM', text: 'Lunch is being served: try check-in.' },
  { key: 'dinner', icon: Moon, title: 'Today 7:30 PM', text: 'Dinner is being served.' },
];
const WINDOW = { open: ['Window open', 'ok'], grace: ['Grace period', 'warn'], closed: ['Window closed', undefined] };

export default function ClockPage() {
  const { data, isLoading, error } = useClockQuery();
  const [setClock, { isLoading: saving, error: saveError }] = useSetClockMutation();
  const dispatch = useDispatch();
  const [custom, setCustom] = useState({ date: '', time: '12:30' });
  const now = useServerNow(data?.now);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const apply = async (body, msg) => {
    const res = await setClock(body);
    if (res.data) dispatch(toastAdded(msg ?? `Clock set to ${DAYS[res.data.dayIndex]} ${res.data.time}.`));
  };
  const p = ist(now);

  return (
    <>
      <PageHeader title="Demo clock" sub="Move the app's clock to show every rule in a demo. Real users would never see this; it's for the course demo only." />
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card span-2">
          <div className="stat-label">App time (IST)</div>
          <div className="stat-value mono" style={{ fontSize: 34 }}>{DAYS[p.dayIndex]} {p.date} · {p.time}</div>
          <div className="row-wrap" style={{ marginTop: 10 }}>
            <Badge tone={data.active ? 'warn' : 'ok'} dot>{data.active ? 'Simulated time' : 'Real time'}</Badge>
            <Badge tone={WINDOW[data.window][1]}>{WINDOW[data.window][0]}</Badge>
          </div>
        </div>
        <div className="card stack">
          <label className="check">
            <input type="checkbox" checked={data.relaxedHours} onChange={(e) => apply({ relaxedHours: e.target.checked }, e.target.checked ? 'Check-in allowed outside meal hours.' : 'Check-in only during meal hours.')} />
            <span><b>Allow check-in outside meal hours</b><br /><span className="small muted">Counts toward the nearest meal. Keep on so the live demo always works.</span></span>
          </label>
          <button className="btn" disabled={!data.active || saving} onClick={() => apply({ preset: 'real' }, 'Back to real time.')}><RotateCcw size={16} /> Back to real time</button>
        </div>
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Jump to</h2>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {PRESETS.map(({ key, icon: Icon, title, text }) => (
          <button key={key} className="card" style={{ textAlign: 'left', cursor: 'pointer' }} disabled={saving} onClick={() => apply({ preset: key })}>
            <div className="row" style={{ marginBottom: 6 }}><Icon size={18} color="var(--brand)" /><b>{title}</b></div>
            <div className="small muted">{text}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Custom time</div>
        <div className="row-wrap">
          <input type="date" className="input" style={{ width: 180 }} value={custom.date} onChange={(e) => setCustom({ ...custom, date: e.target.value })} />
          <input type="time" className="input" style={{ width: 130 }} value={custom.time} onChange={(e) => setCustom({ ...custom, time: e.target.value })} />
          <button className="btn btn-primary" disabled={!custom.date || saving} onClick={() => apply(custom)}>Set</button>
        </div>
      </div>
      {saveError && <div style={{ marginTop: 12 }}><ErrorBox>{errorText(saveError)}</ErrorBox></div>}
    </>
  );
}
