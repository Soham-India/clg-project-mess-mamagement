'use client';
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useCounterCheckinMutation, useCheckinCodeQuery, errorText } from '@/store/api';
import { PageHeader, ResultCard, ErrorBox } from '@/components/ui';

// Fallback for students without a phone: staff type the roll number.
export default function CounterPage() {
  const [rollNo, setRollNo] = useState('');
  const [history, setHistory] = useState([]);
  const [counter, { isLoading, error }] = useCounterCheckinMutation();
  const { data: live } = useCheckinCodeQuery(undefined, { pollingInterval: 5000 });

  const submit = async (e) => {
    e.preventDefault();
    const res = await counter(rollNo.trim());
    if (res.data) {
      setHistory((h) => [res.data, ...h].slice(0, 8));
      setRollNo('');
    }
  };

  return (
    <>
      <PageHeader title="Counter check-in" sub="For students without a phone. Type their roll number from the ID card." />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card stack" onSubmit={submit}>
          <label className="field">
            <span className="label">Roll number</span>
            <input className="input code-input" style={{ letterSpacing: '0.15em', fontSize: 28 }} value={rollNo} onChange={(e) => setRollNo(e.target.value.toUpperCase())} placeholder="B523052" autoFocus />
          </label>
          {error && <ErrorBox>{errorText(error)}</ErrorBox>}
          <button className="btn btn-primary btn-lg" disabled={!rollNo || isLoading}><KeyRound size={18} /> Check in</button>
          {live?.count && (
            <p className="small muted">{live.meal.label}: <b style={{ color: 'var(--ink)' }}>{live.count.served}</b> of {live.count.expected} served at {live.unitName}.</p>
          )}
        </form>
        <div className="stack">
          {history.length === 0 ? (
            <div className="card small muted">Results appear here. Try B523052 (coupon plan), B523011 (another mess) or B522033.</div>
          ) : (
            <>
              <ResultCard data={history[0]} />
              {history.slice(1).map((h, i) => (
                <div key={i} className="card card-tight row between small">
                  <span><b>{h.student?.name ?? 'Unknown'}</b> <span className="muted">{h.student?.rollNo}</span></span>
                  <span className={`badge badge-${h.result === 'ok' ? 'ok' : 'bad'}`}>{h.title}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
