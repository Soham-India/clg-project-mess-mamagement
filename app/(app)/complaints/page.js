'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, ThumbsUp, MessageSquareWarning, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import { useComplaintsQuery, useCreateComplaintMutation, useUpdateComplaintMutation, useMetooMutation, errorText } from '@/store/api';
import { selectUser } from '@/store/authSlice';
import { toastAdded } from '@/store/uiSlice';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, MEALS, mealLabel } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge, statusTone, Empty, Modal } from '@/components/ui';

const catLabel = (k) => COMPLAINT_CATEGORIES.find((c) => c.key === k)?.label ?? k;
const ago = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const FILTERS = [['all', 'All'], ['open', 'Open'], ['in_progress', 'In progress'], ['escalated', 'Escalated'], ['resolved', 'Resolved']];

export default function ComplaintsPage() {
  const user = useSelector(selectUser);
  const { data, isLoading, error } = useComplaintsQuery();
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(false);

  if (isLoading || !user) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const list = data.complaints.filter((c) => filter === 'all' || c.status === filter);
  const sub = {
    student: 'Complaints about your mess. Staff reply here; the mess society steps in if an issue is not fixed.',
    staff: 'Complaints about your mess. Reply, then mark them resolved.',
    society: 'Complaints from every mess. Escalate the ones staff have not fixed.',
    admin: 'Complaints from every mess (read only).',
  }[user.role];

  return (
    <>
      <PageHeader title="Complaints" sub={sub}>
        {user.role === 'student' && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} /> New complaint</button>}
      </PageHeader>
      <div className="segmented" style={{ marginBottom: 16 }}>
        {FILTERS.map(([k, label]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
            {label} {k !== 'all' && <span className="faint">{data.complaints.filter((c) => c.status === k).length}</span>}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card"><Empty icon={MessageSquareWarning} title="Nothing here">No complaints with this status.</Empty></div>
      ) : (
        <div className="stack">
          {list.map((c) => <ComplaintCard key={c.id} c={c} user={user} />)}
        </div>
      )}
      {creating && <NewComplaint onClose={() => setCreating(false)} />}
    </>
  );
}

function ComplaintCard({ c, user }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [update, { isLoading, error }] = useUpdateComplaintMutation();
  const [metoo] = useMetooMutation();

  const act = async (status) => {
    const res = await update({ id: c.id, status, note });
    if (res.data) {
      setNote('');
      dispatch(toastAdded(`Complaint marked ${COMPLAINT_STATUS[status].toLowerCase()}.`));
    }
  };

  const actions = [];
  if (user.role === 'staff') {
    if (c.status === 'open') actions.push(['in_progress', 'Mark in progress'], ['resolved', 'Resolve']);
    if (c.status === 'in_progress') actions.push(['resolved', 'Resolve']);
  }
  if (user.role === 'society') {
    if (['open', 'in_progress', 'resolved'].includes(c.status)) actions.push(['escalated', 'Escalate to contractor']);
    if (c.status === 'escalated') actions.push(['resolved', 'Close as resolved']);
  }
  if (user.role === 'student' && c.mine && c.status === 'resolved') actions.push(['open', 'Not fixed? Reopen']);

  return (
    <article className="card">
      <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="row-wrap">
          <Badge tone={statusTone(c.status)} dot>{COMPLAINT_STATUS[c.status]}</Badge>
          <Badge>{catLabel(c.category)}</Badge>
          {c.meal && <Badge>{mealLabel(c.meal)}</Badge>}
          {user.role !== 'student' && user.role !== 'staff' && <Badge tone="brand">{c.messUnitName}</Badge>}
        </div>
        <span className="tiny faint nowrap">#{c.id} · {ago(c.createdAt)}</span>
      </div>
      <p style={{ marginTop: 12, fontSize: 15 }}>{c.text}</p>
      <div className="row between" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <span className="small muted row" style={{ gap: 6 }}>
          {c.anonymous && <EyeOff size={14} />}
          {c.author}{c.authorRoll ? ` · ${c.authorRoll}` : ''}{c.anonymous && c.author !== 'Anonymous' ? ' (posted anonymously)' : ''}
        </span>
        <div className="row">
          {user.role === 'student' && !c.mine ? (
            <button className={`btn btn-sm ${c.iMetoo ? 'btn-primary' : ''}`} onClick={() => metoo(c.id)} aria-pressed={c.iMetoo}>
              <ThumbsUp size={14} /> Me too · {c.metoo}
            </button>
          ) : (
            <span className="small muted row" style={{ gap: 4 }}><ThumbsUp size={14} /> {c.metoo}</span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
            History {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {c.reply && <div className="reply"><b>Mess staff:</b> {c.reply}</div>}
      {open && (
        <div className="timeline">
          {c.history.map((h, i) => (
            <div key={i} className="timeline-item">
              <b>{COMPLAINT_STATUS[h.status]}</b> <span className="muted">by {h.by} · {ago(h.at)}</span>
              {h.note && h.note !== 'Complaint raised' && <div className="muted">{h.note}</div>}
            </div>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className="stack" style={{ marginTop: 14, gap: 8 }}>
          {(user.role === 'staff' || user.role === 'society') && (
            <textarea
              className="textarea"
              style={{ minHeight: 64 }}
              placeholder={user.role === 'staff' ? 'Reply to the student (required)' : 'Note (optional)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
          {error && <ErrorBox>{errorText(error)}</ErrorBox>}
          <div className="row-wrap">
            {actions.map(([status, label]) => (
              <button key={status} className={`btn btn-sm ${status === 'escalated' ? 'btn-danger' : status === 'resolved' ? 'btn-primary' : ''}`} disabled={isLoading} onClick={() => act(status)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function NewComplaint({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ category: 'quality', meal: '', text: '', anonymous: false });
  const [create, { isLoading, error }] = useCreateComplaintMutation();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const res = await create(form);
    if (res.data) {
      dispatch(toastAdded('Complaint sent to your mess staff.'));
      onClose();
    }
  };
  return (
    <Modal title="New complaint" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <label className="field">
            <span className="label">Category</span>
            <select className="select" value={form.category} onChange={set('category')}>
              {COMPLAINT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Meal</span>
            <select className="select" value={form.meal} onChange={set('meal')}>
              <option value="">Not about one meal</option>
              {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="label">What happened?</span>
          <textarea className="textarea" value={form.text} onChange={set('text')} placeholder="Be specific: what, when, and how often." maxLength={600} required />
          <span className="hint">{form.text.length}/600</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.anonymous} onChange={set('anonymous')} />
          <span>Post anonymously <span className="muted small">(other students won&apos;t see your name; staff and the society still can)</span></span>
        </label>
        {error && <ErrorBox>{errorText(error)}</ErrorBox>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send complaint'}</button>
        </div>
      </form>
    </Modal>
  );
}
