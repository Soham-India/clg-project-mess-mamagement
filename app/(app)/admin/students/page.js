'use client';
import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Search } from 'lucide-react';
import { useStudentsQuery, useUpdateStudentMutation, errorText } from '@/store/api';
import { toastAdded } from '@/store/uiSlice';
import { MESS_UNITS } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge } from '@/components/ui';

export default function StudentsPage() {
  const { data, isLoading, error } = useStudentsQuery();
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('all');
  const [update, { error: saveError }] = useUpdateStudentMutation();
  const dispatch = useDispatch();

  const list = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.students.filter(
      (x) => (unit === 'all' || x.messUnit === unit) && (!s || x.name.toLowerCase().includes(s) || x.rollNo.toLowerCase().includes(s)),
    );
  }, [data, q, unit]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const change = async (s, field, value) => {
    const res = await update({ id: s.id, [field]: field === 'batch' ? Number(value) : value });
    if (res.data) {
      const st = res.data.student;
      dispatch(toastAdded(res.data.note ?? `${s.name} → ${st.messUnitName}`, res.data.note ? 'bad' : 'ok'));
    }
  };

  return (
    <>
      <PageHeader title="Students" sub="Mess allotment is computed from batch, plan and gender. Change any of them and the mess updates automatically." />
      <div className="grid grid-5" style={{ marginBottom: 16 }}>
        {MESS_UNITS.map((u) => (
          <button key={u.code} className="card card-tight" style={{ textAlign: 'left', cursor: 'pointer', borderColor: unit === u.code ? 'var(--brand)' : undefined }} onClick={() => setUnit(unit === u.code ? 'all' : u.code)}>
            <div className="stat-label">{u.short}</div>
            <div className="stat-value">{data.unitCounts[u.code] ?? 0}</div>
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 12, maxWidth: 360, position: 'relative' }}>
        <Search size={16} className="muted" style={{ position: 'absolute', left: 12 }} />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="Search name or roll number" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {saveError && <div style={{ marginBottom: 12 }}><ErrorBox>{errorText(saveError)}</ErrorBox></div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Student</th><th>Batch</th><th>Gender</th><th>Plan</th><th>Mess (computed)</th></tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b><div className="tiny muted">{s.rollNo}</div></td>
                <td>
                  <select className="select" style={{ height: 34, width: 96 }} value={s.batch} onChange={(e) => change(s, 'batch', e.target.value)} aria-label={`Batch of ${s.name}`}>
                    {[1, 2, 3, 4].map((b) => <option key={b} value={b}>Year {b}</option>)}
                  </select>
                </td>
                <td>
                  <select className="select" style={{ height: 34, width: 100 }} value={s.gender} onChange={(e) => change(s, 'gender', e.target.value)} aria-label={`Gender of ${s.name}`}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </td>
                <td>
                  <select className="select" style={{ height: 34, width: 110 }} value={s.plan} onChange={(e) => change(s, 'plan', e.target.value)} disabled={s.batch <= 2} aria-label={`Plan of ${s.name}`} title={s.batch <= 2 ? '1st and 2nd years are always on the fixed plan' : ''}>
                    <option value="fixed">Fixed</option>
                    <option value="coupon">Coupon</option>
                  </select>
                </td>
                <td><Badge tone={s.plan === 'coupon' ? 'warn' : 'brand'}>{s.messUnitName}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>Plan changes normally happen only at the start of a semester.</p>
    </>
  );
}
