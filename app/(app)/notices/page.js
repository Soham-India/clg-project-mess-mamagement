'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Megaphone } from 'lucide-react';
import { useNoticesQuery, useCreateNoticeMutation, errorText } from '@/store/api';
import { selectUser } from '@/store/authSlice';
import { toastAdded } from '@/store/uiSlice';
import { NOTICE_KINDS, MEALS, MESS_UNITS } from '@/lib/constants';
import { addDays } from '@/lib/clock';
import { PageHeader, Loading, ErrorBox, Empty, Modal } from '@/components/ui';
import NoticeCard from '@/components/NoticeCard';

const FILTERS = [['current', 'Now'], ['upcoming', 'Coming up'], ['past', 'Ended']];

export default function NoticesPage() {
  const user = useSelector(selectUser);
  const { data, isLoading, error } = useNoticesQuery();
  const [filter, setFilter] = useState('current');
  const [creating, setCreating] = useState(false);

  if (isLoading || !user) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const canPost = user.role !== 'student';
  const list = data.notices.filter((n) => n.state === filter);
  const sub = {
    student: 'Special meals, veg-only days and service updates for your mess.',
    staff: 'Tell students about special meals, menu changes or problems at your mess.',
    society: 'Post notices for one mess or for every mess.',
    admin: 'Post notices for one mess or for every mess.',
  }[user.role];
  const emptyText = {
    current: 'There are no notices right now.',
    upcoming: 'Nothing is planned yet.',
    past: 'No notices ended in the last 30 days.',
  }[filter];

  return (
    <>
      <PageHeader title="Notice board" sub={sub}>
        {canPost && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} /> New notice</button>}
      </PageHeader>
      <div className="segmented" style={{ marginBottom: 16 }}>
        {FILTERS.map(([k, label]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
            {label} <span className="faint">{data.notices.filter((n) => n.state === k).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card">
          <Empty icon={Megaphone} title="No notices">
            {emptyText}{canPost && filter !== 'past' ? ' Use New notice to post one.' : ''}
          </Empty>
        </div>
      ) : (
        <div className="stack">
          {list.map((n) => <NoticeCard key={n.id} n={n} />)}
        </div>
      )}
      {creating && <NewNotice user={user} today={data.today} onClose={() => setCreating(false)} />}
    </>
  );
}

function NewNotice({ user, today, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    title: '', body: '', kind: 'special', meal: '', messUnit: '', startsOn: today, endsOn: addDays(today, 2), pinned: false,
  });
  const [create, { isLoading, error }] = useCreateNoticeMutation();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const res = await create(form);
    if (res.data) {
      dispatch(toastAdded('Notice posted. Students can see it now.'));
      onClose();
    }
  };

  return (
    <Modal title="New notice" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Diwali special lunch" maxLength={80} required />
        </label>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <label className="field">
            <span className="label">Type</span>
            <select className="select" value={form.kind} onChange={set('kind')}>
              {NOTICE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Meal</span>
            <select className="select" value={form.meal} onChange={set('meal')}>
              <option value="">All meals or none</option>
              {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="label">Message</span>
          <textarea className="textarea" value={form.body} onChange={set('body')} placeholder="Say what changes, when, and what students should do." maxLength={600} required />
          <span className="hint">{form.body.length}/600</span>
        </label>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <label className="field">
            <span className="label">Show from</span>
            <input className="input" type="date" value={form.startsOn} onChange={set('startsOn')} required />
          </label>
          <label className="field">
            <span className="label">Show until</span>
            <input className="input" type="date" value={form.endsOn} min={form.startsOn} onChange={set('endsOn')} required />
          </label>
        </div>
        {user.role === 'staff' ? (
          <p className="small muted">Only students of your mess will see this notice.</p>
        ) : (
          <label className="field">
            <span className="label">Who sees it</span>
            <select className="select" value={form.messUnit} onChange={set('messUnit')}>
              <option value="">Every mess</option>
              {MESS_UNITS.map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
            </select>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={form.pinned} onChange={set('pinned')} />
          <span>Pin to the top <span className="muted small">(for important notices)</span></span>
        </label>
        {error && <ErrorBox>{errorText(error)}</ErrorBox>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Posting…' : 'Post notice'}</button>
        </div>
      </form>
    </Modal>
  );
}
