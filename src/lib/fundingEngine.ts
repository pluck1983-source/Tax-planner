import { ageInMonths, nextFundingCountDate, parseISODate } from './dateUtils';
import type {
  AgeBand,
  Child,
  ChildminderRates,
  FundingRate,
  FundingType,
  LatePickupRate,
  LocalAuthority,
  NonFundedRate,
  Term,
} from './types';

export const FUNDED_HOURS_PER_WEEK: Record<FundingType, number> = {
  universal15: 15,
  extended30: 30,
};

export const FUNDING_TYPE_LABELS: Record<FundingType, string> = {
  universal15: '15 hours (universal)',
  extended30: '30 hours (extended, working parents)',
};

/**
 * The date a child becomes eligible for a given age band's funding -
 * reaching the qualifying age doesn't unlock funding immediately, only from
 * the next national funding "count date" (1 Jan / 1 Apr / 1 Sep) on or
 * after their qualifying birthday, which is then matched against a term's
 * actual start date by the caller.
 */
export function fundingEligibilityDate(dob: Date, minAgeMonths: number): Date {
  const qualifiesFrom = new Date(dob);
  qualifiesFrom.setMonth(qualifiesFrom.getMonth() + minAgeMonths);
  return nextFundingCountDate(qualifiesFrom);
}

/**
 * The highest age band a child has become eligible for by the start of the
 * given term, applying the "eligible from the term following their
 * birthday" rule. Returns null if the child hasn't reached the youngest
 * funded age band yet.
 */
export function eligibleAgeBandForTerm(dob: Date, term: Term, ageBands: AgeBand[]): AgeBand | null {
  const termStart = parseISODate(term.startDate);
  const sorted = [...ageBands].sort((a, b) => b.minAgeMonths - a.minAgeMonths);
  for (const band of sorted) {
    if (fundingEligibilityDate(dob, band.minAgeMonths) <= termStart) return band;
  }
  return null;
}

/** Convenience wrapper using a plain age-in-months snapshot, for display purposes only (not billing). */
export function currentAgeBand(dob: Date, ageBands: AgeBand[], asOf: Date): AgeBand | null {
  const months = ageInMonths(dob, asOf);
  const sorted = [...ageBands].sort((a, b) => b.minAgeMonths - a.minAgeMonths);
  return sorted.find((band) => months >= band.minAgeMonths) ?? null;
}

function latestEffective<T extends { effectiveFrom: string }>(rates: T[], asOf: Date): T | null {
  const applicable = rates.filter((r) => parseISODate(r.effectiveFrom) <= asOf);
  if (applicable.length === 0) return null;
  return applicable.reduce((latest, r) =>
    parseISODate(r.effectiveFrom) > parseISODate(latest.effectiveFrom) ? r : latest,
  );
}

export function fundingRateFor(
  la: LocalAuthority,
  ageBandId: string,
  fundingType: FundingType,
  asOf: Date,
): FundingRate | null {
  const rates = la.fundingRates.filter((r) => r.ageBandId === ageBandId && r.fundingType === fundingType);
  return latestEffective(rates, asOf);
}

/** Non-funded hourly rate: prefers a rate specific to the age band, falling back to the generic (ageBandId: null) rate. */
export function nonFundedRateFor(rates: ChildminderRates, ageBandId: string | null, asOf: Date): NonFundedRate | null {
  const specific = ageBandId ? latestEffective(rates.nonFundedRates.filter((r) => r.ageBandId === ageBandId), asOf) : null;
  if (specific) return specific;
  return latestEffective(rates.nonFundedRates.filter((r) => r.ageBandId === null), asOf);
}

export function latePickupRateFor(rates: ChildminderRates, asOf: Date): LatePickupRate | null {
  return latestEffective(rates.latePickupRates, asOf);
}

export function latePickupCharge(rate: LatePickupRate, minutesLate: number): number {
  if (minutesLate <= rate.graceMinutes) return 0;
  const chargeableMinutes = minutesLate - rate.graceMinutes;
  switch (rate.chargeType) {
    case 'flat':
      return rate.amount;
    case 'perHour':
      return rate.amount * Math.ceil(chargeableMinutes / 60);
    case 'per15Min':
      return rate.amount * Math.ceil(chargeableMinutes / 15);
  }
}

export function childAgeBandId(child: Child, ageBands: AgeBand[], asOf: Date): string | null {
  return currentAgeBand(parseISODate(child.dateOfBirth), ageBands, asOf)?.id ?? null;
}
