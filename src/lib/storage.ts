import type { MonthlyEntry, PlannerState, TaxYearData, TaxYearRates } from './types';
import {
  DEFAULT_TAX_YEARS,
  getDefaultRatesForYear,
  startYearFromYearId,
  yearIdFromStartYear,
} from './defaultRates';

const STORAGE_KEY = 'tax-planner-state-v1';
const DEFAULT_KNOWN_IDS = new Set(DEFAULT_TAX_YEARS.map((y) => y.id));

export function emptyMonths(): MonthlyEntry[] {
  return Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    paye: 0,
    payeTaxDeducted: null,
    dividends: 0,
    otherIncome: 0,
    pensionContribution: 0,
    giftAid: 0,
    capitalGains: 0,
    savedThisMonth: 0,
    notes: '',
  }));
}

export function createYearData(rates: TaxYearRates): TaxYearData {
  return { id: rates.id, rates, months: emptyMonths() };
}

const RATES_FALLBACK_DEFAULTS: Pick<
  TaxYearRates,
  'pensionGiftAidGrossUpRate' | 'cgtAnnualExemptAmount' | 'cgtRates'
> = {
  pensionGiftAidGrossUpRate: 0.2,
  cgtAnnualExemptAmount: 3000,
  cgtRates: { basic: 0.18, higher: 0.24 },
};

const MONTH_FALLBACK_DEFAULTS: Pick<MonthlyEntry, 'pensionContribution' | 'giftAid' | 'capitalGains'> = {
  pensionContribution: 0,
  giftAid: 0,
  capitalGains: 0,
};

/**
 * Backfills fields that didn't exist in older saved/exported data (e.g. from
 * before pension/Gift Aid/CGT support was added) so stale localStorage or
 * import files don't produce NaN once those fields are read.
 */
function normalizeState(state: PlannerState): PlannerState {
  const years: Record<string, TaxYearData> = {};
  for (const [id, year] of Object.entries(state.years)) {
    years[id] = {
      ...year,
      rates: { ...RATES_FALLBACK_DEFAULTS, ...year.rates },
      months: year.months.map((m) => ({ ...MONTH_FALLBACK_DEFAULTS, ...m })),
    };
  }
  return { ...state, years };
}

/** Which UK tax year (by start calendar year) a given date falls in. */
export function taxYearStartForDate(date: Date): number {
  const year = date.getFullYear();
  const aprilSixth = new Date(year, 3, 6);
  return date >= aprilSixth ? year : year - 1;
}

function initialState(): PlannerState {
  const currentStartYear = taxYearStartForDate(new Date());
  const priorRates = getDefaultRatesForYear(currentStartYear - 1);
  const currentRates = getDefaultRatesForYear(currentStartYear);
  const years: Record<string, TaxYearData> = {
    [priorRates.id]: createYearData(priorRates),
    [currentRates.id]: createYearData(currentRates),
  };
  return {
    years,
    yearOrder: [priorRates.id, currentRates.id],
    selectedYearId: currentRates.id,
  };
}

export function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as PlannerState;
    if (!parsed.years || !parsed.yearOrder) return initialState();
    return normalizeState(parsed);
  } catch {
    return initialState();
  }
}

export function saveState(state: PlannerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function nextYearId(state: PlannerState): string {
  const latest = [...state.yearOrder].sort().at(-1);
  const startYear = latest ? startYearFromYearId(latest) + 1 : taxYearStartForDate(new Date());
  return yearIdFromStartYear(startYear);
}

export function addNewYear(state: PlannerState): PlannerState {
  const latestId = [...state.yearOrder].sort().at(-1);
  const startYear = latestId ? startYearFromYearId(latestId) + 1 : taxYearStartForDate(new Date());
  const id = yearIdFromStartYear(startYear);
  if (state.years[id]) return { ...state, selectedYearId: id };

  const baseRates = getDefaultRatesForYear(startYear);
  // If we don't have known figures for this year yet, carry forward the most
  // recent year's rates (thresholds are typically frozen) rather than silently
  // guessing - the user can edit them on the Rates tab once confirmed.
  const latestRates = latestId ? state.years[latestId]?.rates : undefined;
  const rates =
    latestRates && !DEFAULT_KNOWN_IDS.has(id)
      ? { ...latestRates, id: baseRates.id, label: baseRates.label, startDate: baseRates.startDate, endDate: baseRates.endDate }
      : baseRates;

  const yearData = createYearData(rates);
  return {
    years: { ...state.years, [id]: yearData },
    yearOrder: [...state.yearOrder, id],
    selectedYearId: id,
  };
}

export function exportStateAsJson(state: PlannerState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(json: string): PlannerState {
  const parsed = JSON.parse(json) as PlannerState;
  if (!parsed.years || !parsed.yearOrder) throw new Error('Invalid tax planner file');
  return normalizeState(parsed);
}
