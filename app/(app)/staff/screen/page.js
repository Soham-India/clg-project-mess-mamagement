'use client';
import { useEffect, useRef, useState } from 'react';
import { Maximize, Users } from 'lucide-react';
import { useCheckinCodeQuery } from '@/store/api';
import { PageHeader, Loading, ErrorBox } from '@/components/ui';
import { QR_PREFIX } from '@/components/QrScanner';

// Shown on a screen at the mess entrance. Students scan the QR or type this code to check in.
export default function EntranceScreen() {
  const { data, isLoading, error, fulfilledTimeStamp } = useCheckinCodeQuery(undefined, { pollingInterval: 3000 });
  const [, tick] = useState(0);
  const [qr, setQr] = useState(null);
  const box = useRef(null);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);

  // Redraw the QR whenever the code rotates. It holds the same code as the text below it.
  const code = data?.code;
  useEffect(() => {
    if (!code) return;
    let alive = true;
    import('qrcode')
      .then((QR) => QR.toDataURL(QR_PREFIX + code, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#10251e', light: '#ffffff' } }))
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => { alive = false; };
  }, [code]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const left = Math.max(0, data.msLeft - (Date.now() - (fulfilledTimeStamp ?? Date.now())));
  const frac = left / data.windowMs;
  const R = 26;
  const C = 2 * Math.PI * R;
  const count = data.count;

  return (
    <>
      <PageHeader title="Entrance screen" sub={`Put this on a screen at the door of ${data.unitName}.`}>
        <button className="btn" onClick={() => box.current?.requestFullscreen?.()}><Maximize size={16} /> Full screen</button>
      </PageHeader>
      <div className="screen stack" ref={box} style={{ gap: 24 }}>
        <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="muted small bold" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{data.unitName}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {data.meal ? `${data.meal.label} · ${data.meal.start}–${data.meal.end}` : 'No meal being served'}
            </div>
            {data.meal?.relaxed && <div className="small muted">Demo mode: check-ins outside meal hours count toward {data.meal.label.toLowerCase()}.</div>}
            {!data.meal && data.next && <div className="muted">Next: {data.next.label} at {data.next.start}</div>}
          </div>
          <div className="mono bold" style={{ fontSize: 22 }}>{data.time}</div>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div className="muted bold" style={{ marginBottom: 14 }}>Scan the QR or type the code in Thali to check in</div>
          <div className="row" style={{ justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {qr && (
              <div className="screen-qr">
                <img src={qr} alt={`QR for check-in code ${data.code}`} />
              </div>
            )}
            <div className="screen-code" aria-live="polite">{data.code}</div>
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" className="ring" aria-hidden="true">
              <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
              <circle cx="32" cy="32" r={R} fill="none" stroke="#e9b85a" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
            </svg>
            <span className="muted">New code in <b className="mono" style={{ color: '#fff' }}>{Math.ceil(left / 1000)}s</b></span>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="screen-panel">
            <div className="row muted small bold"><Users size={16} /> Served so far</div>
            {count ? (
              <>
                <div style={{ fontSize: 40, fontWeight: 800 }}>{count.served} <span className="muted" style={{ fontSize: 20 }}>/ {count.expected}</span></div>
                <div className="progress" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <span style={{ width: `${count.expected ? Math.min(100, (count.served / count.expected) * 100) : 0}%`, background: '#e9b85a' }} />
                </div>
              </>
            ) : (
              <div className="muted" style={{ marginTop: 8 }}>Starts when the next meal begins.</div>
            )}
          </div>
          <div className="screen-panel">
            <div className="muted small bold" style={{ marginBottom: 8 }}>Latest check-ins</div>
            {data.recent.length === 0 ? (
              <div className="muted small">No one yet.</div>
            ) : (
              data.recent.map((r, i) => (
                <div key={i} className="row between small" style={{ padding: '3px 0' }}>
                  <span>{r.name} <span className="muted">{r.rollNo}</span></span>
                  <span className="mono muted">{r.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
