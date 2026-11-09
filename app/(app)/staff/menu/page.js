'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Pencil, Save, X } from 'lucide-react';
import { useMenuQuery, useUpdateMenuMutation, errorText } from '@/store/api';
import { selectUser } from '@/store/authSlice';
import { toastAdded } from '@/store/uiSlice';
import { MEALS, DAYS } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge } from '@/components/ui';

export default function MenuEditor() {
  const user = useSelector(selectUser);
  const { data, isLoading, error } = useMenuQuery();
  const [editing, setEditing] = useState(null); // { day, meal, value }
  const [save, { isLoading: saving, error: saveError }] = useUpdateMenuMutation();
  const dispatch = useDispatch();

  if (isLoading || !user) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const submit = async () => {
    const res = await save({ day: editing.day, meal: editing.meal, items: editing.value });
    if (res.data) {
      dispatch(toastAdded(`${DAYS[editing.day]} ${editing.meal} updated.`));
      setEditing(null);
    }
  };

  return (
    <>
      <PageHeader title="Edit menu" sub={`${user.messUnitName}. Click a meal to change it; students see the change right away.`} />
      {saveError && <div style={{ marginBottom: 12 }}><ErrorBox>{errorText(saveError)}</ErrorBox></div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Day</th>
              {MEALS.map((m) => <th key={m.key}>{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={day} className={d === data.todayIndex ? 'today' : ''}>
                <td><b>{day}</b>{d === data.todayIndex && <div style={{ marginTop: 4 }}><Badge tone="warn">Today</Badge></div>}</td>
                {MEALS.map((m) => {
                  const isEditing = editing?.day === d && editing?.meal === m.key;
                  return (
                    <td key={m.key}>
                      {isEditing ? (
                        <div className="stack" style={{ gap: 6 }}>
                          <textarea className="textarea" style={{ minHeight: 70 }} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} maxLength={200} autoFocus />
                          <div className="row">
                            <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}><Save size={14} /> Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={14} /> Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn-ghost"
                          style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, width: '100%' }}
                          onClick={() => setEditing({ day: d, meal: m.key, value: data.days[d][m.key] })}
                          aria-label={`Edit ${day} ${m.label}`}
                        >
                          {data.days[d][m.key]} <Pencil size={12} className="faint" />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
