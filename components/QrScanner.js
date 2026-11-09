'use client';
// Opens the camera and reads the entrance QR code. Calls onCode('AB12CD') once, then stops.
import { useEffect, useRef, useState } from 'react';
import { Loading } from '@/components/ui';

export const QR_PREFIX = 'CAMPUSBITE-CHECKIN:';

/** Accepts "CAMPUSBITE-CHECKIN:AB12CD" (our QR) or a bare 6-char code. Returns the code or null. */
export function codeFromQr(text) {
  const t = String(text || '').trim().toUpperCase();
  const raw = t.startsWith(QR_PREFIX) ? t.slice(QR_PREFIX.length) : t;
  return /^[A-Z0-9]{6}$/.test(raw) ? raw : null;
}

export default function QrScanner({ onCode }) {
  const video = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [message, setMessage] = useState('');
  const [wrongQr, setWrongQr] = useState(false);

  useEffect(() => {
    let stream;
    let raf;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setMessage('Camera needs a secure (https) page. Type the code instead.');
        return;
      }
      try {
        const [{ default: jsQR }, s] = await Promise.all([
          import('jsqr'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
        ]);
        stream = s;
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current;
        v.srcObject = stream;
        await v.play();
        setStatus('scanning');

        let last = 0;
        const loop = (time) => {
          if (stopped) return;
          raf = requestAnimationFrame(loop);
          if (time - last < 150 || v.readyState < 2) return; // ~6 scans a second is plenty
          last = time;
          const w = v.videoWidth;
          const h = v.videoHeight;
          if (!w || !h) return;
          const scale = Math.min(1, 640 / Math.max(w, h));
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (!hit) return;
          const code = codeFromQr(hit.data);
          if (code) {
            stopped = true;
            onCode(code);
          } else {
            setWrongQr(true);
          }
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        setStatus('error');
        setMessage(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow the camera for this site in your browser settings, or type the code.'
            : err?.name === 'NotFoundError'
            ? 'No camera found on this device. Type the code instead.'
            : 'Could not open the camera. Type the code instead.'
        );
      }
    }
    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  if (status === 'error') return <div className="error-box" role="alert">{message}</div>;

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="scanner">
        <video ref={video} playsInline muted />
        <div className="scanner-frame" aria-hidden="true" />
        {status === 'starting' && <div className="scanner-wait"><Loading /></div>}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>
        {wrongQr ? 'That is not a CampusBite entrance QR. Point at the code on the entrance screen.' : 'Point your camera at the QR on the entrance screen.'}
      </p>
    </div>
  );
}
