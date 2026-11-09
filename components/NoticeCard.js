'use client';
// One notice on the board. Used on the Notice board page and the student home page.
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Pin, Trash2, CalendarDays } from 'lucide-react';
import { useDeleteNoticeMutation, errorText } from '@/store/api';
import { toastAdded } from '@/store/uiSlice';
import { noticeKind, mealLabel, ROLE_LABEL } from '@/lib/constants';
import { Badge, ErrorBox } from './ui';

const day = (date, withMonth = true) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', ...(withMonth ? { month: 'short' } : {}), timeZone: 'UTC' });

/** "12 Nov", "12–14 Nov", or "30 Nov – 2 Dec". */
export function noticeDates(startsOn, endsOn) {
  if (startsOn === endsOn) return day(startsOn);
  if (startsOn.slice(0, 7) === endsOn.slice(0, 7)) return `${day(startsOn, false)}–${day(endsOn)}`;
  return `${day(startsOn)} – ${day(endsOn)}`;
}

export default function NoticeCard({ n, compact = false }) {
  const dispatch = useDispatch();
  const [confirming, setConfirming] = useState(false);
  const [remove, { isLoading, error }] = useDeleteNoticeMutation();
  const kind = noticeKind(n.kind);

  const doDelete = async () => {
    const res = await remove(n.id);
    if (res.data) dispatch(toastAdded('Notice deleted.'));
  };

  return (
    <article className={`card notice notice-${n.kind} ${n.state === 'past' ? 'notice-past' : ''}`}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="row-wrap">
          <Badge tone={kind.tone} dot>{kind.label}</Badge>
          {n.meal && <Badge>{mealLabel(n.meal)}</Badge>}
          {n.state === 'upcoming' && <Badge tone="info">Coming up</Badge>}
          {n.state === 'past' && <Badge>Ended</Badge>}
          {!compact && <Badge tone="brand">{n.messUnitName}</Badge>}
        </div>
        {n.pinned && <Pin size={16} color="var(--coral)" aria-label="Pinned" />}
      </div>
      <h3 className="notice-title">{n.title}</h3>
      <p className="notice-body">{n.body}</p>
      <div className="row between" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <span className="small muted row" style={{ gap: 6 }}>
          <CalendarDays size={14} /> {noticeDates(n.startsOn, n.endsOn)}
          {!compact && <> · {n.author} ({ROLE_LABEL[n.authorRole]})</>}
        </span>
        {!compact && n.canDelete && (
          confirming ? (
            <div className="row">
              <span className="small bold">Delete this notice?</span>
              <button className="btn btn-sm" onClick={() => setConfirming(false)} disabled={isLoading}>Keep</button>
              <button className="btn btn-sm btn-danger" onClick={doDelete} disabled={isLoading}>{isLoading ? 'Deleting…' : 'Delete'}</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)} aria-label={`Delete notice: ${n.title}`}>
              <Trash2 size={14} /> Delete
            </button>
          )
        )}
      </div>
      {error && <div style={{ marginTop: 10 }}><ErrorBox>{errorText(error)}</ErrorBox></div>}
    </article>
  );
}
