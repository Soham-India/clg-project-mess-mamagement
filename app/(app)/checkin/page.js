'use client';
import { useCallback, useState } from 'react';
import { ScanLine, QrCode } from 'lucide-react';
import { useCheckinMutation, useHomeQuery, errorText } from '@/store/api';
import { MEALS } from '@/lib/constants';
import { PageHeader, ResultCard, ErrorBox, Badge, Modal } from '@/components/ui';
import QrScanner from '@/components/QrScanner';

export default function CheckinPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [checkin, { isLoading, error }] = useCheckinMutation();
  const { data: home } = useHomeQuery();

  const send = useCallback(async (value) => {
    const res = await checkin(value);
    if (res.data) {
      setResult(res.data);
      if (res.data.result === 'ok') setCode('');
    }
  }, [checkin]);

  const submit = (e) => {
    e.preventDefault();
    send(code);
  };

  // Scanned QR: close the camera and check in straight away.
  const onScan = useCallback((value) => {
    setScanning(false);
    setCode(value);
    send(value);
  }, [send]);
  const closeScanner = useCallback(() => setScanning(false), []);

  return (
    <>
      <PageHeader title="Check in" sub="Scan the QR or type the 6-character code shown on the screen at the mess entrance. It changes every 30 seconds." />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card stack" onSubmit={submit}>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setScanning(true)} disabled={isLoading}>
            <QrCode size={18} /> Scan QR
          </button>
          <div className="or-divider">or type the code</div>
          <label className="field">
            <span className="label">Entrance code</span>
            <input
              className="input code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="······"
              inputMode="text"
              autoComplete="off"
              aria-describedby="code-hint"
            />
            <span id="code-hint" className="hint">Each mess has its own code, so you can only check in where you are allotted.</span>
          </label>
          {error && <ErrorBox>{errorText(error)}</ErrorBox>}
          <button className="btn btn-lg" disabled={code.length !== 6 || isLoading}>
            <ScanLine size={18} /> {isLoading ? 'Checking…' : 'Check in with code'}
          </button>
        </form>

        {scanning && (
          <Modal title="Scan entrance QR" onClose={closeScanner}>
            <QrScanner onCode={onScan} />
          </Modal>
        )}

        <div className="stack">
          {result ? (
            <ResultCard data={result} />
          ) : (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Today</div>
              {home ? (
                <div className="stack" style={{ gap: 8 }}>
                  <p className="small muted">You eat at <b style={{ color: 'var(--ink)' }}>{home.messUnitName}</b>.</p>
                  {MEALS.map((m) => {
                    const done = home.checkedIn.includes(m.key);
                    const coupon = home.coupons?.today.find((c) => c.meal === m.key);
                    return (
                      <div key={m.key} className="row between small">
                        <span><b>{m.label}</b> <span className="faint">{m.start}–{m.end}</span></span>
                        {done ? (
                          <Badge tone="ok">Checked in</Badge>
                        ) : home.coupons && !coupon ? (
                          <Badge tone="bad">No coupon</Badge>
                        ) : (
                          <Badge>Not yet</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="small muted">Loading…</p>
              )}
            </div>
          )}
          {result && (
            <button className="btn btn-ghost" onClick={() => setResult(null)}>Show today&apos;s status</button>
          )}
        </div>
      </div>
    </>
  );
}
