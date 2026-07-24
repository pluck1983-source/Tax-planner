import { addDays, parseISODate, rangesOverlap, startOfWeek, timeToMinutes, toISODate } from './dateUtils';
import {
  FUNDED_HOURS_PER_WEEK,
  eligibleAgeBandForTerm,
  fundingRateFor,
  nonFundedRateFor,
} from './fundingEngine';
import type { AgeBand, AttendancePattern, Child, ChildminderState, Term } from './types';

export function weeklyScheduledHours(child: Child): number {
  return child.weeklySchedule.reduce((sum, day) => {
    const minutes = timeToMinutes(day.endTime) - timeToMinutes(day.startTime);
    return sum + Math.max(0, minutes) / 60;
  }, 0);
}

/**
 * A child's attendance pattern as of a given date - the entry with the
 * latest effectiveFrom on or before that date applies, so a parent
 * switching between term-time-only and full-time takes effect from
 * whatever date they choose rather than retroactively. Defaults to
 * full-time if no history is recorded (matches pre-existing behaviour).
 */
export function attendancePatternForDate(child: Child, date: Date): AttendancePattern {
  const applicable = child.attendancePatternHistory.filter((p) => parseISODate(p.effectiveFrom) <= date);
  if (applicable.length === 0) return 'fullTime';
  return applicable.reduce((latest, p) => (parseISODate(p.effectiveFrom) > parseISODate(latest.effectiveFrom) ? p : latest)).pattern;
}

export function isChildActiveInWeek(child: Child, weekStart: Date, weekEnd: Date): boolean {
  const start = parseISODate(child.startDate);
  const end = child.endDate ? parseISODate(child.endDate) : null;
  if (start > weekEnd) return false;
  if (end && end < weekStart) return false;
  return true;
}

/** The term whose date range contains `date`, if any - term-time funding only applies inside one of these. */
export function termForDate(terms: Term[], date: Date): Term | null {
  return terms.find((t) => date >= parseISODate(t.startDate) && date <= parseISODate(t.endDate)) ?? null;
}

export function childminderOnHoliday(state: ChildminderState, weekStart: Date, weekEnd: Date): boolean {
  return state.holidays.some(
    (h) => h.owner.type === 'childminder' && rangesOverlap(parseISODate(h.startDate), parseISODate(h.endDate), weekStart, weekEnd),
  );
}

export function childOnHoliday(state: ChildminderState, childId: string, weekStart: Date, weekEnd: Date): boolean {
  return state.holidays.some(
    (h) =>
      h.owner.type === 'client' &&
      h.owner.childId === childId &&
      rangesOverlap(parseISODate(h.startDate), parseISODate(h.endDate), weekStart, weekEnd),
  );
}

export interface WeekChildBreakdown {
  childId: string;
  weekStart: string;
  scheduledHours: number;
  isTermWeek: boolean;
  term: Term | null;
  onHoliday: boolean;
  holidaySource: 'childminder' | 'client' | null;
  /** True when a term-time-only child's schedule doesn't apply this week because it's outside term time */
  notAttendingThisWeek: boolean;
  attendancePattern: AttendancePattern;
  ageBand: AgeBand | null;
  fundedHours: number;
  fundedRate: number;
  fundedAmount: number;
  nonFundedHours: number;
  nonFundedRate: number;
  nonFundedAmount: number;
  /** True when no funding rate/non-funded rate could be found to price hours - forecast for this week is incomplete. */
  missingRate: boolean;
  total: number;
}

const HOLIDAY_DISCOUNT = 0.5;

/**
 * Prices one child's scheduled hours for one week. Funded hours only apply
 * during a term week and are capped at the entitlement for the child's
 * funding type; any hours beyond that (or all hours if the child isn't
 * funded or it's outside term time) are billed at the childminder's own
 * non-funded rate. A holiday (either the childminder's or this child's)
 * halves the non-funded portion as a retainer and drops funded hours to
 * zero, since the child isn't attending and no funding is claimed.
 */
export function computeWeekForChild(state: ChildminderState, child: Child, weekStart: Date): WeekChildBreakdown {
  const weekEnd = addDays(weekStart, 6);
  const term = termForDate(state.terms, weekStart);
  const isTermWeek = term !== null;
  const attendancePattern = attendancePatternForDate(child, weekStart);
  const notAttendingThisWeek = attendancePattern === 'termTimeOnly' && !isTermWeek;
  const scheduledHours = notAttendingThisWeek ? 0 : weeklyScheduledHours(child);
  const onChildminderHoliday = childminderOnHoliday(state, weekStart, weekEnd);
  const onClientHoliday = childOnHoliday(state, child.id, weekStart, weekEnd);
  const onHoliday = !notAttendingThisWeek && (onChildminderHoliday || onClientHoliday);
  const holidaySource: 'childminder' | 'client' | null = onHoliday ? (onChildminderHoliday ? 'childminder' : 'client') : null;

  const ageBand = term ? eligibleAgeBandForTerm(parseISODate(child.dateOfBirth), term, state.ageBands) : null;

  let fundedHours = 0;
  let fundedRate = 0;
  let missingRate = false;

  if (!onHoliday && isTermWeek && child.fundingType !== 'none' && ageBand) {
    const la = child.localAuthorityId ? state.localAuthorities.find((l) => l.id === child.localAuthorityId) : null;
    const rate = la ? fundingRateFor(la, ageBand.id, child.fundingType, weekStart) : null;
    if (rate) {
      const entitlement = FUNDED_HOURS_PER_WEEK[child.fundingType];
      fundedHours = Math.min(entitlement, scheduledHours);
      fundedRate = rate.hourlyRate;
    } else {
      missingRate = true;
    }
  }

  const remainingHours = Math.max(0, scheduledHours - fundedHours);
  const nonFundedRateEntry = nonFundedRateFor(state.rates, ageBand?.id ?? null, weekStart);
  const nonFundedRate = nonFundedRateEntry?.hourlyRate ?? 0;
  if (!nonFundedRateEntry && remainingHours > 0 && !onHoliday) missingRate = true;

  const nonFundedAmountFull = remainingHours * nonFundedRate;
  const nonFundedAmount = onHoliday ? nonFundedAmountFull * HOLIDAY_DISCOUNT : nonFundedAmountFull;
  const fundedAmount = fundedHours * fundedRate;

  return {
    childId: child.id,
    weekStart: weekStart.toISOString().slice(0, 10),
    scheduledHours,
    isTermWeek,
    term,
    onHoliday,
    holidaySource,
    notAttendingThisWeek,
    attendancePattern,
    ageBand,
    fundedHours,
    fundedRate,
    fundedAmount,
    nonFundedHours: remainingHours,
    nonFundedRate,
    nonFundedAmount,
    missingRate,
    total: fundedAmount + nonFundedAmount,
  };
}

export function generateWeekStarts(from: Date, count: number): Date[] {
  const first = startOfWeek(from);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

export interface WeekForecast {
  weekStart: Date;
  breakdowns: WeekChildBreakdown[];
  total: number;
}

export function computeForecast(state: ChildminderState, from: Date, weekCount: number): WeekForecast[] {
  const weeks = generateWeekStarts(from, weekCount);
  return weeks.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const breakdowns = state.children
      .filter((c) => c.active && isChildActiveInWeek(c, weekStart, weekEnd))
      .map((c) => computeWeekForChild(state, c, weekStart));
    return { weekStart, breakdowns, total: breakdowns.reduce((sum, b) => sum + b.total, 0) };
  });
}

/** The Monday-start weeks that fall inside a specific term, distinct from any adjoining term. */
function weeksWithinTerm(state: ChildminderState, term: Term): Date[] {
  const weeks: Date[] = [];
  const end = parseISODate(term.endDate);
  let cursor = startOfWeek(parseISODate(term.startDate));
  while (cursor <= end) {
    const owning = termForDate(state.terms, cursor);
    if (owning && owning.id === term.id) weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function monthsOverlapping(term: Term): { year: number; month: number }[] {
  const start = parseISODate(term.startDate);
  const end = parseISODate(term.endDate);
  const months: { year: number; month: number }[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return months;
}

export interface FundingPaymentEvent {
  localAuthorityId: string;
  localAuthorityName: string;
  term: Term;
  amount: number;
  paymentDate: string;
}

/**
 * Total funded (LA-paid) income earned in a term, per local authority, and
 * when that money actually arrives - a termly-paid council pays one lump
 * sum in arrears after processing that term's headcount, while a
 * monthly-paid council spreads the same total evenly across the calendar
 * months the term touches. This is separate from the weekly accrual figures
 * shown elsewhere, which reflect when hours are delivered rather than when
 * cash lands.
 */
export function computeFundingPaymentsForTerm(state: ChildminderState, term: Term): FundingPaymentEvent[] {
  const totalsByLA = new Map<string, number>();
  for (const weekStart of weeksWithinTerm(state, term)) {
    const weekEnd = addDays(weekStart, 6);
    for (const child of state.children) {
      if (!child.localAuthorityId || !child.active || !isChildActiveInWeek(child, weekStart, weekEnd)) continue;
      const breakdown = computeWeekForChild(state, child, weekStart);
      if (breakdown.fundedAmount > 0) {
        totalsByLA.set(child.localAuthorityId, (totalsByLA.get(child.localAuthorityId) ?? 0) + breakdown.fundedAmount);
      }
    }
  }

  const events: FundingPaymentEvent[] = [];
  for (const [laId, total] of totalsByLA) {
    const la = state.localAuthorities.find((l) => l.id === laId);
    if (!la || total <= 0) continue;
    if (la.fundingPaymentSchedule === 'termly') {
      events.push({
        localAuthorityId: la.id,
        localAuthorityName: la.name,
        term,
        amount: total,
        paymentDate: toISODate(addDays(parseISODate(term.startDate), la.termlyPaymentLagWeeks * 7)),
      });
    } else {
      const months = monthsOverlapping(term);
      const perMonth = total / months.length;
      for (const { year, month } of months) {
        events.push({
          localAuthorityId: la.id,
          localAuthorityName: la.name,
          term,
          amount: perMonth,
          paymentDate: toISODate(new Date(year, month + 1, 0)),
        });
      }
    }
  }
  return events.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
}

export function computeFundingPayments(state: ChildminderState): FundingPaymentEvent[] {
  return state.terms.flatMap((term) => computeFundingPaymentsForTerm(state, term)).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
}

/**
 * Projected income for the remaining weeks of a tax year, from today to
 * the year's end date - used to turn "confirmed income to date" into a
 * full-year forecast for the Tax tab. Weeks are billed in full even where
 * today falls mid-week, and any week starting after the tax year's end
 * date is excluded, both acceptable approximations given the app's
 * week-level granularity.
 */
export function computeRemainingYearForecastTotal(state: ChildminderState, taxYearEndDate: string): number {
  const today = new Date();
  const endDate = parseISODate(taxYearEndDate);
  if (startOfWeek(today) > endDate) return 0;
  const weekCount = Math.ceil((endDate.getTime() - startOfWeek(today).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const weeks = computeForecast(state, today, weekCount).filter((w) => w.weekStart <= endDate);
  return weeks.reduce((sum, w) => sum + w.total, 0);
}
