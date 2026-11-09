'use client';
import { mealLabel } from '@/lib/constants';

const fmt = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Expected vs served for each meal, for today and tomorrow. */
export default function HeadcountView({ data }) {
  const max = Math.max(1, ...data.today.meals.map((m) => m.expected), ...data.tomorrow.meals.map((m) => m.expected));
  return (
    <div className="grid grid-2">
      {[['Today', data.today, true], ['Tomorrow', data.tomorrow, false]].map(([label, day, showServed]) => (
        <div key={label} className="card">
          <div className="card-head">
            <div className="card-title">{label}</div>
            <span className="small muted">{fmt(day.date)}</span>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            {day.meals.map((m) => (
              <div key={m.meal}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <b>{mealLabel(m.meal)}</b>
                  <span className="small">
                    Cook for <b style={{ fontSize: 18 }}>{m.expected}</b>
                    {showServed && <span className="muted"> · {m.served} served</span>}
                  </span>
                </div>
                <div className="progress" style={{ height: 14, position: 'relative' }}>
                  <span style={{ width: `${(m.expected / max) * 100}%`, background: 'var(--accent-soft)', position: 'absolute', inset: 0, right: 'auto' }} />
                  {showServed && <span style={{ width: `${(m.served / max) * 100}%`, position: 'absolute', inset: 0, right: 'auto' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
