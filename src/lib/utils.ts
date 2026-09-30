import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pad = (n: number) => String(n).padStart(2, '0');

/* ---------- numbers ---------- */
export function fmtHM(mins: number | null | undefined) {
  const m = Math.max(0, Math.round(mins || 0));
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}
export function fmtHours(mins: number | null | undefined) {
  return ((mins || 0) / 60).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
export function pct(value: number, max: number) {
  return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
}
export const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((a, r) => a + (pick(r) || 0), 0);

/* ---------- dates (ISO strings, timezone-free) ---------- */
export const isMonth = (v?: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const isDay = (v?: string | null): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function todayIn(tz?: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
export function hourIn(tz?: string) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  } catch {
    return new Date().getUTCHours();
  }
}
export function greeting(hour: number) {
  return hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
export function shiftDay(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
export const monthRange = (ym: string) => ({ start: `${ym}-01`, end: `${shiftMonth(ym, 1)}-01` });
export function daysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function monthLabel(ym: string, month: 'long' | 'short' = 'long') {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month, year: 'numeric', timeZone: 'UTC' });
}
export function dayLabel(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}
export const weekOfMonth = (iso: string) => Math.min(3, Math.floor((Number(iso.slice(8, 10)) - 1) / 7));

export function hhmm(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const t5 = (t?: string | null) => (t ? t.slice(0, 5) : null);
export function minsBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const p = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  let m = p(b) - p(a);
  if (m < 0) m += 1440;
  return m;
}

/* ---------- text ---------- */
export function hostOf(u: string) {
  return u.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[/?#].*$/, '').toLowerCase();
}
export function initials(name?: string | null) {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}
export function safeNext(next?: string | null, fallback = '/today') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

/* ---------- data ---------- */
/** Page through a PostgREST query past the 1000-row response cap. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
