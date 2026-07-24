/** Parses an ISO "YYYY-MM-DD" date as a local-time midnight Date, avoiding UTC-shift-by-a-day bugs from `new Date(iso)`. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Age in whole months as of `asOf`. */
export function ageInMonths(dob: Date, asOf: Date): number {
  let months = (asOf.getFullYear() - dob.getFullYear()) * 12 + (asOf.getMonth() - dob.getMonth());
  if (asOf.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * The next of the three standard funding "count dates" (1 January, 1 April,
 * 1 September) on or after `date`. These are the national termly cohort
 * points that determine which term a child's funded hours start in - not
 * the child's actual birthday.
 */
export function nextFundingCountDate(date: Date): Date {
  const year = date.getFullYear();
  const candidates = [
    new Date(year, 0, 1),
    new Date(year, 3, 1),
    new Date(year, 8, 1),
    new Date(year + 1, 0, 1),
  ];
  return candidates.find((c) => c >= date)!;
}

/** Parses "HH:MM" into minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
}
