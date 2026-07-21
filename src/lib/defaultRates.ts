import type { TaxYearRates } from './types';

/**
 * Rest-of-UK (England, Wales, Northern Ireland) rates. Scotland has separate
 * non-dividend income tax bands - not modelled here. Thresholds have been
 * frozen since 2021/22 and are frozen until April 2028 per government policy,
 * so 2026/27 and 2027/28 default to the same figures as 2025/26 - edit them
 * on the Rates tab once HMRC/the Budget confirms otherwise.
 */
const BASE_RATES = {
  personalAllowance: 12570,
  paTaperThreshold: 100000,
  paTaperRate: 0.5,
  basicRateBandWidth: 37700,
  additionalRateThreshold: 125140,
  nonDividendRates: { basic: 0.2, higher: 0.4, additional: 0.45 },
  dividendAllowance: 500,
  dividendRates: { basic: 0.0875, higher: 0.3375, additional: 0.3935 },
  poaThreshold: 1000,
  poaSourceCollectionFraction: 0.8,
};

function makeYear(startYear: number, overrides: Partial<TaxYearRates> = {}): TaxYearRates {
  const endYear = startYear + 1;
  const id = `${startYear}-${String(endYear).slice(-2)}`;
  return {
    ...BASE_RATES,
    id,
    label: `${startYear}/${String(endYear).slice(-2)}`,
    startDate: `${startYear}-04-06`,
    endDate: `${endYear}-04-05`,
    ...overrides,
  };
}

export const DEFAULT_TAX_YEARS: TaxYearRates[] = [
  makeYear(2023, { dividendAllowance: 1000 }),
  makeYear(2024),
  makeYear(2025),
  makeYear(2026),
];

export function getDefaultRatesForYear(startYear: number): TaxYearRates {
  const known = DEFAULT_TAX_YEARS.find((y) => y.id.startsWith(String(startYear)));
  if (known) return known;
  return makeYear(startYear);
}

export function yearIdFromStartYear(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function startYearFromYearId(id: string): number {
  return Number(id.split('-')[0]);
}
