'use client';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useMenuQuery } from '@/store/api';
import { selectUser } from '@/store/authSlice';
import { MEALS, DAYS, MESS_UNITS } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge } from '@/components/ui';

export default function MenuPage() {
  const user = useSelector(selectUser);
  const [unit, setUnit] = useState(null);
  const { data, isLoading, isFetching, error } = useMenuQuery(unit ?? undefined);
  const current = unit ?? data?.unit;
  const canPick = user && user.role !== 'student';

  return (
    <>
      <PageHeader
        title="Weekly menu"
        sub={user?.role === 'student' ? 'Menu at your mess. Veg and non-veg options are served together.' : 'Menu for each mess. Each mess staff team edits its own.'}
      >
        {canPick && (
          <div className="segmented" role="tablist">
            {MESS_UNITS.map((u) => (
              <button key={u.code} className={current === u.code ? 'on' : ''} onClick={() => setUnit(u.code)} role="tab" aria-selected={current === u.code}>
                {u.short}
              </button>
            ))}
          </div>
        )}
      </PageHeader>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <div className="table-wrap" style={{ opacity: isFetching ? 0.6 : 1 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Day</th>
                {MEALS.map((m) => (
                  <th key={m.key}>{m.label} <span className="faint" style={{ textTransform: 'none', letterSpacing: 0 }}>{m.start}–{m.end}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => (
                <tr key={day} className={i === data.todayIndex ? 'today' : ''}>
                  <td>
                    <b>{day}</b>
                    {i === data.todayIndex && <div style={{ marginTop: 4 }}><Badge tone="warn">Today</Badge></div>}
                  </td>
                  {MEALS.map((m) => (
                    <td key={m.key}>{data.days[i][m.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
