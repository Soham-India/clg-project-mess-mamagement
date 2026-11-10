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

/** Three katoris bouncing in turn. `full` centres it on the whole screen (first page load). */
export function Loading({ full = false }) {
  return (
    <div className={`loading ${full ? 'loading-full' : ''}`} role="status" aria-label="Loading">
      <div className="katori-loader" aria-hidden="true"><span /><span /><span /></div>
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
  // Re-sync straight away when the server time changes (e.g. data just loaded),
  // so the very first render never mixes an old/undefined value with a new one.
  if (base.current.server !== serverNow) base.current = { server: serverNow, local: Date.now() };
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
      <circle cx="20" cy="20" r="19" fill="#d4573a" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="#f5e8cc" strokeWidth="1.5" opacity="0.7" />
      <circle cx="14.5" cy="15.5" r="4.2" fill="#f2b632" />
      <circle cx="25.5" cy="15.5" r="4.2" fill="#f5e8cc" />
      <circle cx="20" cy="25.5" r="5" fill="#2e5a4c" />
    </svg>
  );
}

// Fixed (not random) positions so server and browser render the same picture.
const RICE = [
  [118, 236, 20], [132, 228, -30], [146, 222, 10], [162, 226, 60], [176, 236, -15], [124, 252, 45],
  [140, 246, -5], [156, 242, 30], [172, 252, -40], [190, 254, 15], [116, 268, -20], [132, 266, 70],
  [148, 262, 0], [164, 268, 35], [182, 270, -25], [128, 284, 10], [146, 282, -50], [162, 286, 20],
  [178, 284, -10], [140, 296, 40], [158, 298, -30], [196, 238, 50], [110, 252, -60],
];
const SALT = [[96, 92], [310, 256], [284, 312], [92, 300], [330, 150], [214, 344], [74, 186], [242, 60], [318, 214], [120, 330]];
const KATORIS = [
  { cx: 136, cy: 126, r: 46, fill: '#e9ad2c', top: '#f4c656' }, // dal
  { cx: 238, cy: 102, r: 42, fill: '#c6492c', top: '#de6a45' }, // sabzi
  { cx: 302, cy: 182, r: 38, fill: '#efe5cf', top: '#fbf4e4' }, // raita
];

/** Illustrated steel thali on a banana leaf: dal, sabzi, raita, rice and roti. */
export function ThaliPlate({ size = 440, label = 'A thali with dal, sabzi, raita, rice and roti' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <path d="M24 352 C 120 150 250 40 392 18 C 360 170 230 300 24 352 Z" fill="#4c8a4a" />
      <path d="M24 352 C 150 250 280 120 392 18" stroke="#3a6e3a" strokeWidth="3" fill="none" />
      <circle cx="200" cy="206" r="178" fill="#13241f" opacity="0.35" />
      <circle cx="200" cy="198" r="178" fill="#56685f" />
      <circle cx="200" cy="198" r="164" fill="#3d4d47" />
      <circle cx="200" cy="198" r="150" fill="#344440" />
      {SALT.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#e9e1cf" opacity="0.7" />)}
      {KATORIS.map((b, i) => (
        <g key={i}>
          <circle cx={b.cx} cy={b.cy + 4} r={b.r} fill="#1d2b27" opacity="0.4" />
          <circle cx={b.cx} cy={b.cy} r={b.r} fill="#c9d0cb" />
          <circle cx={b.cx} cy={b.cy} r={b.r - 6} fill={b.fill} />
          <ellipse cx={b.cx - b.r * 0.22} cy={b.cy - b.r * 0.25} rx={b.r * 0.42} ry={b.r * 0.22} fill={b.top} opacity="0.75" />
        </g>
      ))}
      {[[126, 132], [146, 120], [140, 142], [118, 116]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#7a3b12" />)}
      {[[226, 110], [250, 96], [242, 118], [292, 176], [312, 190], [300, 168]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4" ry="2.2" fill="#3f8a3c" transform={`rotate(${i * 35} ${x} ${y})`} />
      ))}
      <ellipse cx="154" cy="262" rx="66" ry="50" fill="#f7f1e2" />
      <ellipse cx="146" cy="250" rx="46" ry="28" fill="#fffaf0" />
      {RICE.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="5" ry="2" fill="#e6dcc4" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <circle cx="264" cy="276" r="54" fill="#c98d4a" />
      <circle cx="264" cy="272" r="52" fill="#e3b574" />
      {[[244, 256, 7], [282, 262, 5], [258, 294, 6], [290, 290, 4], [270, 240, 4], [236, 284, 3]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill="#b77937" opacity="0.8" />
      ))}
      <path d="M200 200 L 232 196 A 32 32 0 0 1 212 226 Z" fill="#f2d24a" />
      <path d="M204 204 L 226 201 A 24 24 0 0 1 212 220 Z" fill="#f8e58a" />
      <path d="M196 330 C 220 322 246 326 268 340" stroke="#3f8a3c" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M268 340 l 8 -6" stroke="#2d6b2c" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Two dried turmeric-yellow chillies, a small decoration. */
export function Chillies({ size = 90 }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" aria-hidden="true">
      <path d="M10 40 C 30 30 52 30 72 40 C 56 46 30 48 10 40 Z" fill="#e3a72a" />
      <path d="M72 40 l 10 -5" stroke="#5d7d3a" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 22 C 44 10 64 10 84 18 C 66 26 44 28 28 22 Z" fill="#cf9220" />
      <path d="M84 18 l 9 -6" stroke="#5d7d3a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Flat outline plate, used faintly behind text. */
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
