import { defaultTaxYearSettings, taxYearStartForDate } from './taxEngine';
import type { AgeBand, ChildminderState } from './types';

export const DEFAULT_AGE_BANDS: AgeBand[] = [
  { id: 'age-9m-2y', label: '9 months to 2 years', minAgeMonths: 9 },
  { id: 'age-2y', label: '2 years', minAgeMonths: 24 },
  { id: 'age-3-4y', label: '3 & 4 years', minAgeMonths: 36 },
];

export function initialChildminderState(): ChildminderState {
  const currentTaxYear = defaultTaxYearSettings(taxYearStartForDate(new Date()));
  return {
    ageBands: DEFAULT_AGE_BANDS,
    localAuthorities: [],
    rates: { nonFundedRates: [], latePickupRates: [] },
    children: [],
    holidays: [],
    terms: [],
    attendance: [],
    fundingPaymentsReceived: [],
    parentPaymentsReceived: [],
    taxYears: [currentTaxYear],
    selectedTaxYearId: currentTaxYear.id,
  };
}
