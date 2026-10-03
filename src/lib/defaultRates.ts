import type { TaxYearRates } from './types';

/**
 * Rest-of-UK (England, Wales, Northern Ireland) rates. Scotland has separate
 * non-dividend income tax bands - not modelled here. Thresholds have been
 * frozen since 2021/22, and the November 2025 Budget extended the freeze to
 * April 2031, so later years default to the same thresholds as 2025/26 -
 * edit them on the Rates tab if a future Budget changes them.
 */
const BASE_RATES = {
  personalAllowance: 12570,
  paTaperThreshold: 100000,
  paTaperRate: 0.5,
  basicRateBandWidth: 37700,
  additionalRateThreshold: 125140,
  nonDividendRates: { basic: 0.2, higher: 0.4, additional: 0.45 },
  dividendAllowance: 500,
  poaThreshold: 1000,
  poaSourceCollectionFraction: 0.8,
  pensionGrossUpRate: 0.2,
  // CGT rates were unified for general assets and residential property from
  // 30 Oct 2024 (Autumn Budget); this default applies from 2024/25 onward.
  cgtAnnualExemptAmount: 3000,
  cgtRates: { basic: 0.18, higher: 0.24 },
  // Starting rate for savings (£5,000 band) and Personal Savings Allowance
  // have been stable at these figures since 2016/17.
  savingsStartingRateBandWidth: 5000,
  savingsAllowance: { basic: 1000, higher: 500, additional: 0 },
};

/** Dividend rates from 2022/23 to 2025/26 */
export const DIVIDEND_RATES_TO_2025 = { basic: 0.0875, higher: 0.3375, additional: 0.3935 };
/**
 * From 6 April 2026 the ordinary and upper dividend rates each rose by 2
 * percentage points (November 2025 Budget); the additional rate is unchanged.
 */
export const DIVIDEND_RATES_FROM_2026 = { basic: 0.1075, higher: 0.3575, additional: 0.3935 };

/** Savings interest rates up to 2026/27 - the same as the salary rates */
export const SAVINGS_RATES_TO_2026 = { basic: 0.2, higher: 0.4, additional: 0.45 };
/** From 6 April 2027 savings interest rates rise by 2 points (November 2025 Budget). */
export const SAVINGS_RATES_FROM_2027 = { basic: 0.22, higher: 0.42, additional: 0.47 };

type RateSet = { basic: number; higher: number; additional: number };
const sameRates = (a: RateSet, b: RateSet) => a.basic === b.basic && a.higher === b.higher && a.additional === b.additional;

/**
 * Brings a year's rates up to date with rate changes that start partway
 * through the run of years: rates that still exactly match the old defaults
 * (so were never edited by hand) are moved onto the new ones for years the
 * change applies to. Used when loading saved data and when a new year
 * copies the previous year's rates.
 */
export function applyScheduledRateChanges(rates: TaxYearRates): TaxYearRates {
  const startYear = startYearFromYearId(rates.id);
  let { dividendRates, savingsRates } = rates;
  if (startYear >= 2026 && sameRates(dividendRates, DIVIDEND_RATES_TO_2025)) dividendRates = { ...DIVIDEND_RATES_FROM_2026 };
  if (startYear >= 2027 && sameRates(savingsRates, SAVINGS_RATES_TO_2026)) savingsRates = { ...SAVINGS_RATES_FROM_2027 };
  return dividendRates === rates.dividendRates && savingsRates === rates.savingsRates
    ? rates
    : { ...rates, dividendRates, savingsRates };
}

function makeYear(startYear: number, overrides: Partial<TaxYearRates> = {}): TaxYearRates {
  const endYear = startYear + 1;
  const id = `${startYear}-${String(endYear).slice(-2)}`;
  return {
    ...BASE_RATES,
    dividendRates: { ...(startYear >= 2026 ? DIVIDEND_RATES_FROM_2026 : DIVIDEND_RATES_TO_2025) },
    savingsRates: { ...(startYear >= 2027 ? SAVINGS_RATES_FROM_2027 : SAVINGS_RATES_TO_2026) },
    id,
    label: `${startYear}/${String(endYear).slice(-2)}`,
    startDate: `${startYear}-04-06`,
    endDate: `${endYear}-04-05`,
    ...overrides,
  };
}

export const DEFAULT_TAX_YEARS: TaxYearRates[] = [
  makeYear(2023, {
    dividendAllowance: 1000,
    // 2023/24 general-asset CGT rates were 10%/20% (residential property was
    // 18%/28% - not modelled separately here, edit on the Rates tab if needed).
    cgtAnnualExemptAmount: 6000,
    cgtRates: { basic: 0.1, higher: 0.2 },
  }),
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
