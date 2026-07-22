import type { MonthlyEntry, PlannerState, TaxYearData, TaxYearRates } from './types';
import {
  DEFAULT_TAX_YEARS,
  getDefaultRatesForYear,
  startYearFromYearId,
  yearIdFromStartYear,
} from './defaultRates';
import { sumMonths } from './taxEngine';

const STORAGE_KEY = 'tax-planner-state-v1';
const DEFAULT_KNOWN_IDS = new Set(DEFAULT_TAX_YEARS.map((y) => y.id));

export function emptyMonths(): MonthlyEntry[] {
  return Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    paye: 0,
    payeTaxDeducted: null,
    dividendsEmployment: 0,
    dividendsShareDealing: 0,
    otherIncome: 0,
    pensionContribution: 0,
    giftAid: 0,
    capitalGains: 0,
    savedThisMonth: 0,
    hmrcPaymentMade: 0,
    notes: '',
  }));
}

export function createYearData(rates: TaxYearRates, isIndicative = false): TaxYearData {
  return { id: rates.id, rates, months: emptyMonths(), isIndicative };
}

const RATES_FALLBACK_DEFAULTS: Pick<
  TaxYearRates,
  'pensionGiftAidGrossUpRate' | 'cgtAnnualExemptAmount' | 'cgtRates'
> = {
  pensionGiftAidGrossUpRate: 0.2,
  cgtAnnualExemptAmount: 3000,
  cgtRates: { basic: 0.18, higher: 0.24 },
};

const MONTH_FALLBACK_DEFAULTS: Pick<
  MonthlyEntry,
  | 'pensionContribution'
  | 'giftAid'
  | 'capitalGains'
  | 'hmrcPaymentMade'
  | 'dividendsEmployment'
  | 'dividendsShareDealing'
> = {
  pensionContribution: 0,
  giftAid: 0,
  capitalGains: 0,
  hmrcPaymentMade: 0,
  dividendsEmployment: 0,
  dividendsShareDealing: 0,
};

/**
 * Migrates a month from the older single combined "dividends" field into
 * "dividendsEmployment" (a reasonable default, since most of what this
 * planner tracked before the split was company dividends) so a saved total
 * doesn't silently vanish just because the field was split in two.
 */
function migrateMonth(raw: MonthlyEntry): MonthlyEntry {
  const legacy = raw as unknown as { dividends?: number };
  const merged: MonthlyEntry = { ...MONTH_FALLBACK_DEFAULTS, ...raw };
  if (typeof legacy.dividends === 'number' && merged.dividendsEmployment === 0 && merged.dividendsShareDealing === 0) {
    merged.dividendsEmployment = legacy.dividends;
  }
  return merged;
}

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
      isIndicative: year.isIndicative ?? false,
      rates: { ...RATES_FALLBACK_DEFAULTS, ...year.rates },
      months: year.months.map((m) => migrateMonth(m)),
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

/**
 * Adds a tax year before the earliest one currently on record - useful for
 * seeding an actual prior year so payments on account for your earliest
 * tracked year can be calculated properly, instead of assuming none are
 * required for lack of history.
 */
export function addPreviousYear(state: PlannerState): PlannerState {
  const earliestId = [...state.yearOrder].sort().at(0);
  const startYear = earliestId
    ? startYearFromYearId(earliestId) - 1
    : taxYearStartForDate(new Date()) - 1;
  const id = yearIdFromStartYear(startYear);
  if (state.years[id]) return { ...state, selectedYearId: id };

  const rates = getDefaultRatesForYear(startYear);
  const yearData = createYearData(rates);
  return {
    years: { ...state.years, [id]: yearData },
    yearOrder: [id, ...state.yearOrder],
    selectedYearId: id,
  };
}

export interface IndicativeTotals {
  paye: number;
  payeTaxDeducted: number | null;
  dividendsEmployment: number;
  dividendsShareDealing: number;
  otherIncome: number;
  pensionContribution: number;
  giftAid: number;
  capitalGains: number;
  savedThisMonth: number;
  /** Due 31 January - this year's payment on account 1 plus the prior year's balancing payment */
  hmrcPaymentJan: number;
  /** Due 31 July - the prior year's payment on account 2 */
  hmrcPaymentJul: number;
}

/**
 * Indicative years store their totals via the same 12-month structure as
 * every other year (so nothing else in the app needs to know the
 * difference) - bulk figures live in April, and HMRC payments live in
 * January/July specifically, since the payments ledger looks them up by
 * exact due date.
 */
function buildIndicativeMonths(totals: IndicativeTotals): MonthlyEntry[] {
  return emptyMonths().map((m) => {
    if (m.monthIndex === 0) {
      return {
        ...m,
        paye: totals.paye,
        payeTaxDeducted: totals.payeTaxDeducted,
        dividendsEmployment: totals.dividendsEmployment,
        dividendsShareDealing: totals.dividendsShareDealing,
        otherIncome: totals.otherIncome,
        pensionContribution: totals.pensionContribution,
        giftAid: totals.giftAid,
        capitalGains: totals.capitalGains,
        savedThisMonth: totals.savedThisMonth,
      };
    }
    if (m.monthIndex === 9) return { ...m, hmrcPaymentMade: totals.hmrcPaymentJan };
    if (m.monthIndex === 3) return { ...m, hmrcPaymentMade: totals.hmrcPaymentJul };
    return m;
  });
}

/** Reads the current totals back out of an indicative year's month data. */
export function getIndicativeTotals(year: TaxYearData): IndicativeTotals {
  const bulk = year.months.find((m) => m.monthIndex === 0)!;
  const jan = year.months.find((m) => m.monthIndex === 9)!;
  const jul = year.months.find((m) => m.monthIndex === 3)!;
  return {
    paye: bulk.paye,
    payeTaxDeducted: bulk.payeTaxDeducted,
    dividendsEmployment: bulk.dividendsEmployment,
    dividendsShareDealing: bulk.dividendsShareDealing,
    otherIncome: bulk.otherIncome,
    pensionContribution: bulk.pensionContribution,
    giftAid: bulk.giftAid,
    capitalGains: bulk.capitalGains,
    savedThisMonth: bulk.savedThisMonth,
    hmrcPaymentJan: jan.hmrcPaymentMade,
    hmrcPaymentJul: jul.hmrcPaymentMade,
  };
}

/**
 * Switches a year between month-by-month and indicative (yearly totals)
 * entry. Going indicative collapses the current monthly figures into a
 * single aggregate (monthly detail is lost, though the totals aren't);
 * going back to monthly spreads the totals evenly across 12 months as a
 * starting point to fine-tune.
 */
export function setIndicative(state: PlannerState, yearId: string, indicative: boolean): PlannerState {
  const year = state.years[yearId];
  if (!year || year.isIndicative === indicative) return state;

  let months: MonthlyEntry[];
  if (indicative) {
    const totals = sumMonths(year.months, year.rates);
    const hmrcPaymentJan = year.months.find((m) => m.monthIndex === 9)?.hmrcPaymentMade ?? 0;
    const hmrcPaymentJul = year.months.find((m) => m.monthIndex === 3)?.hmrcPaymentMade ?? 0;
    months = buildIndicativeMonths({
      paye: totals.paye,
      // An annual PAYE-deducted override doesn't map cleanly onto monthly
      // auto-estimates - revert to auto-estimating from the total salary.
      payeTaxDeducted: null,
      dividendsEmployment: totals.dividendsEmployment,
      dividendsShareDealing: totals.dividendsShareDealing,
      otherIncome: totals.otherIncome,
      pensionContribution: totals.pensionContribution,
      giftAid: totals.giftAid,
      capitalGains: totals.capitalGains,
      savedThisMonth: totals.savedThisMonth,
      hmrcPaymentJan,
      hmrcPaymentJul,
    });
  } else {
    const totals = getIndicativeTotals(year);
    const spread = (amount: number, index: number) => {
      const base = Math.floor(amount / 12);
      const remainder = amount - base * 12;
      // Put the rounding remainder in the last month so the total is exact.
      return index === 11 ? base + remainder : base;
    };
    months = emptyMonths().map((m) => ({
      ...m,
      paye: spread(totals.paye, m.monthIndex),
      dividendsEmployment: spread(totals.dividendsEmployment, m.monthIndex),
      dividendsShareDealing: spread(totals.dividendsShareDealing, m.monthIndex),
      otherIncome: spread(totals.otherIncome, m.monthIndex),
      pensionContribution: spread(totals.pensionContribution, m.monthIndex),
      giftAid: spread(totals.giftAid, m.monthIndex),
      capitalGains: spread(totals.capitalGains, m.monthIndex),
      savedThisMonth: spread(totals.savedThisMonth, m.monthIndex),
      hmrcPaymentMade: m.monthIndex === 9 ? totals.hmrcPaymentJan : m.monthIndex === 3 ? totals.hmrcPaymentJul : 0,
    }));
  }

  return { ...state, years: { ...state.years, [yearId]: { ...year, isIndicative: indicative, months } } };
}

/** Resets a year's data back to empty while keeping the year, its rates, and its indicative/monthly mode. */
export function clearYearData(state: PlannerState, yearId: string): PlannerState {
  const year = state.years[yearId];
  if (!year) return state;
  return { ...state, years: { ...state.years, [yearId]: { ...year, months: emptyMonths() } } };
}

/** Removes a year entirely from the planner. */
export function deleteYear(state: PlannerState, yearId: string): PlannerState {
  if (!state.years[yearId]) return state;
  const years = { ...state.years };
  delete years[yearId];
  const yearOrder = state.yearOrder.filter((id) => id !== yearId);
  const selectedYearId = state.selectedYearId === yearId ? (yearOrder[0] ?? null) : state.selectedYearId;
  return { years, yearOrder, selectedYearId };
}

export function exportStateAsJson(state: PlannerState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(json: string): PlannerState {
  const parsed = JSON.parse(json) as PlannerState;
  if (!parsed.years || !parsed.yearOrder) throw new Error('Invalid tax planner file');
  return normalizeState(parsed);
}
