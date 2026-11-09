'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AlertOctagon, Users } from 'lucide-react';
import { useOverviewQuery, useHeadcountQuery } from '@/store/api';
import { MESS_UNITS, mealLabel } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge } from '@/components/ui';
import HeadcountView from '@/components/HeadcountView';

export default function SocietyDashboard() {
  const { data, isLoading, error } = useOverviewQuery(undefined, { pollingInterval: 30000 });
  const [unit, setUnit] = useState('CPN-B');
  const { data: hc } = useHeadcountQuery(unit);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const escalated = data.units.reduce((s, u) => s + u.complaints.escalated, 0);
  const open = data.units.reduce((s, u) => s + u.complaints.open + u.complaints.in_progress, 0);

  return (
    <>
      <PageHeader title="Mess society" sub="Every mess at a glance: today's attendance and complaints that need attention." >
        <Link href="/complaints" className="btn btn-primary">Review complaints</Link>
      </PageHeader>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card card-tight"><div className="stat-label">Students</div><div className="stat-value">{data.units.reduce((s, u) => s + u.students, 0)}</div></div>
        <div className="card card-tight"><div className="stat-label">Open or in progress</div><div className="stat-value">{open}</div></div>
        <div className="card card-tight"><div className="stat-label">Escalated to contractor</div><div className="stat-value" style={{ color: escalated ? 'var(--bad)' : undefined }}>{escalated}</div></div>
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table className="table">
          <thead>
            <tr><th>Mess</th><th>Students</th><th>Today: served / expected</th><th>Complaints</th></tr>
          </thead>
          <tbody>
            {data.units.map((u) => (
              <tr key={u.code}>
                <td><b>{u.name}</b><div className="tiny muted">{u.plan === 'coupon' ? 'Coupon plan' : 'Fixed plan'}</div></td>
                <td><span className="row" style={{ gap: 6 }}><Users size={14} className="muted" /> {u.students}</span></td>
                <td>
                  <div className="row-wrap">
                    {u.today.map((m) => <Badge key={m.meal}>{mealLabel(m.meal)} {m.served}/{m.expected}</Badge>)}
                  </div>
                </td>
                <td>
                  <div className="row-wrap">
                    {u.complaints.escalated > 0 && <Badge tone="bad"><AlertOctagon size={12} /> {u.complaints.escalated} escalated</Badge>}
                    {u.complaints.open + u.complaints.in_progress > 0 && <Badge tone="warn">{u.complaints.open + u.complaints.in_progress} active</Badge>}
                    <Badge tone="ok">{u.complaints.resolved} resolved</Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Cook-for check</h2>
        <div className="segmented">
          {MESS_UNITS.map((u) => <button key={u.code} className={unit === u.code ? 'on' : ''} onClick={() => setUnit(u.code)}>{u.short}</button>)}
        </div>
      </div>
      {hc ? <HeadcountView data={hc} /> : <Loading />}
    </>
  );
}
