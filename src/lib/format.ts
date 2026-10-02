/** ₾24 / ₾14.50 */
export function formatPrice(value: number): string {
  return `₾${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

/** 134 -> "134 min", as the design writes runtimes. */
export function formatRuntime(minutes: number): string {
  return `${minutes} min`;
}

/** Tue 15 Sep */
export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Tuesday 15 September */
export function formatWeekdayDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** 4 September 2026 */
export function formatLongDay(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "IN CINEMAS 2 OCTOBER" style: 2 October */
export function formatDayMonth(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse YYYY-MM-DD as a local date (new Date('2026-10-01') would be UTC). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** The next 7 days starting today. */
export function nextSevenDays(): string[] {
  const start = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return toISODate(d);
  });
}

export function isWithinNextSevenDays(iso: string): boolean {
  return nextSevenDays().includes(iso);
}

/** "Wed, 1 Oct 2026" */
export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "1 Oct 2026" */
export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** mm:ss */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  const source = (name ?? '').trim();
  if (!source) return fallback.slice(0, 2).toUpperCase();
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Round to cents, avoiding 0.1 + 0.2 style artefacts. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
