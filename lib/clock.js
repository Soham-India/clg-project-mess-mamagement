// All mess rules run on India Standard Time (UTC+05:30, no daylight saving),
// using the SERVER clock, never the student's phone.
//
// For demos the admin can move the clock (see /admin/clock). We store an offset
// in milliseconds, so the demo clock keeps ticking instead of being frozen.

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Break a timestamp into IST parts. */
export function ist(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  const date = d.toISOString().slice(0, 10);
  const jsDow = d.getUTCDay(); // 0 = Sunday
  return {
    date, // 'YYYY-MM-DD'
    dow: jsDow, // 0 Sun .. 6 Sat
    dayIndex: (jsDow + 6) % 7, // 0 Mon .. 6 Sun
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    minuteOfDay: d.getUTCHours() * 60 + d.getUTCMinutes(),
    time: d.toISOString().slice(11, 16), // 'HH:MM'
  };
}

/** Timestamp (ms) of an IST wall-clock time. */
export const istToMs = (date, hhmm = '00:00') => Date.parse(`${date}T${hhmm}:00+05:30`);

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week that contains `date`. */
export function mondayOf(date) {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

export const weekDates = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
