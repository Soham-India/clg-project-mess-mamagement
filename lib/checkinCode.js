// Rotating check-in code shown on the screen at each mess entrance.
// It is an HMAC of (secret, mess unit, 30-second window), so:
//  - a code copied to WhatsApp stops working within a minute,
//  - each mess unit has its own code, so we can tell a student they are at the wrong mess.
import crypto from 'node:crypto';
import { MESS_UNITS } from './constants.js';

const SECRET = process.env.CHECKIN_SECRET || 'thali-dev-checkin-secret';
export const CODE_WINDOW_MS = 30_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I confusion

export function codeFor(unit, windowIndex = Math.floor(Date.now() / CODE_WINDOW_MS)) {
  const h = crypto.createHmac('sha256', SECRET).update(`${unit}:${windowIndex}`).digest();
  return Array.from(h.subarray(0, 6), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Which mess unit does this code belong to? Accepts the current and previous window. Returns null if none. */
export function unitForCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (c.length !== 6) return null;
  const w = Math.floor(Date.now() / CODE_WINDOW_MS);
  for (const u of MESS_UNITS) {
    if (codeFor(u.code, w) === c || codeFor(u.code, w - 1) === c) return u.code;
  }
  return null;
}

export const msUntilNextCode = () => CODE_WINDOW_MS - (Date.now() % CODE_WINDOW_MS);
