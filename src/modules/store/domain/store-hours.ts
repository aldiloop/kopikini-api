/**
 * Status operasional gerai (PRD FR-02). Status "Sibuk (High Demand)" belum bisa
 * dihitung karena BSD belum menyediakan data antrean/beban gerai.
 */
export type StoreOperationalStatus = 'OPEN' | 'CLOSED';

/** "HH:MM" atau "HH:MM:SS" -> menit sejak tengah malam. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Menit sejak tengah malam pada zona waktu tertentu (default WIB). */
export function minutesInTimeZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Apakah gerai buka pada `nowMinutes`. Mendukung jam lintas tengah malam
 * (mis. 10:00–01:00). open == close dianggap buka 24 jam.
 */
export function isOpenAt(openTime: string, closeTime: string, nowMinutes: number): boolean {
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  if (open === close) return true;
  if (open < close) return nowMinutes >= open && nowMinutes < close;
  return nowMinutes >= open || nowMinutes < close;
}
