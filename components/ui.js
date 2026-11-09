'use client';
// Small reusable UI pieces.
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toastRemoved } from '@/store/uiSlice';

export function PageHeader({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="row-wrap">{children}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}

export function ErrorBox({ error, children }) {
  if (!error && !children) return null;
  return <div className="error-box" role="alert">{children ?? (error?.data?.error || 'Something went wrong. Please try again.')}</div>;
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={28} style={{ marginBottom: 8, opacity: 0.6 }} />}
      <div className="bold" style={{ color: 'var(--ink)' }}>{title}</div>
      {children && <div className="small" style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

const STATUS_TONE = { open: 'info', in_progress: 'warn', resolved: 'ok', escalated: 'bad' };
export function Badge({ tone, children, dot }) {
  return (
    <span className={`badge ${tone ? `badge-${tone}` : ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
export const statusTone = (s) => STATUS_TONE[s];

/** Server clock: the API sends its current time (which includes the demo clock); we keep ticking from it. */
export function useServerNow(serverNow) {
  const base = useRef({ server: serverNow, local: Date.now() });
  const [, force] = useState(0);
  useEffect(() => {
    base.current = { server: serverNow, local: Date.now() };
  }, [serverNow]);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!serverNow) return Date.now();
  return base.current.server + (Date.now() - base.current.local);
}

export function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${String(sec).padStart(2, '0')}s`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function Countdown({ target, serverNow }) {
  const now = useServerNow(serverNow);
  return <span className="countdown">{formatDuration(target - now)}</span>;
}

/** Big coloured result card used by check-in screens. */
export function ResultCard({ data }) {
  if (!data) return null;
  const tone = data.result === 'ok' ? 'ok' : data.result === 'already' || data.result === 'no_meal' ? 'warn' : 'bad';
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : XCircle;
  return (
    <div className={`result ${tone} fade-in`} role="status" aria-live="polite">
      <div className="result-icon"><Icon size={28} /></div>
      <div className="stack" style={{ gap: 4 }}>
        <h3>{data.title}</h3>
        <p>{data.detail}</p>
        {data.student && (
          <p className="small muted">
            {data.student.name} · {data.student.rollNo} · {data.student.plan === 'coupon' ? 'Coupon plan' : 'Fixed plan'}
            {data.mealLabel ? ` · ${data.mealLabel}` : ''}
            {data.relaxed ? ' (demo mode: outside meal hours)' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal fade-in" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useSelector((s) => s.ui.toasts);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dispatch(toastRemoved(toasts[0].id)), 3500);
    return () => clearTimeout(t);
  }, [toasts, dispatch]);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === 'bad' ? 'bad' : ''} fade-in`}>
          {t.tone === 'bad' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** A simple plate-and-katori mark, used as the logo. */
export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#1f5c4a" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="#f6f3ec" strokeWidth="1.5" opacity="0.6" />
      <circle cx="14.5" cy="15.5" r="4.2" fill="#d99a1e" />
      <circle cx="25.5" cy="15.5" r="4.2" fill="#f6f3ec" />
      <circle cx="20" cy="25.5" r="5" fill="#e9b85a" />
    </svg>
  );
}

export function PlateArt({ size = 320 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill="none" stroke="#fff" strokeWidth="3" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="62" cy="70" r="20" fill="#fff" />
      <circle cx="108" cy="54" r="18" fill="#fff" />
      <circle cx="146" cy="84" r="17" fill="#fff" />
      <ellipse cx="96" cy="128" rx="44" ry="28" fill="#fff" />
    </svg>
  );
}
