import { ApiError } from './gemini.ts';
export const RESERVE_SQL = `INSERT INTO usage_reservations (id, day, visitor, created)
SELECT ?, ?, ?, ? WHERE
(SELECT COUNT(*) FROM usage_reservations WHERE day = ?) < ?
AND (SELECT COUNT(*) FROM usage_reservations WHERE visitor = ? AND created > ?) < ?`;
export function positiveInt(value: string | undefined, fallback: number, max: number) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new ApiError(503, 'CONFIG', 'The editor is temporarily unavailable.');
  return n;
}
export async function visitorHash(ip: string, secret: string, day: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = await crypto.subtle.sign('HMAC', key, encoder.encode(`${day}:${ip}`));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function reserve(db: D1Database, visitor: string, daily: number, perMinute: number, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  // One SQL statement: the check and insert are atomic, including across isolates.
  const result = await db.prepare(RESERVE_SQL).bind(crypto.randomUUID(), day, visitor, now, day, daily, visitor, now - 60000, perMinute).run();
  if (result.meta.changes !== 1) throw new ApiError(429, 'LIMIT', 'The free correction limit has been reached. Wait a minute and try again; the shared daily allowance resets at midnight UTC.', 60);
}
