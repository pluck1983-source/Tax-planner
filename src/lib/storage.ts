import type { MonthlyEntry, PlannerState, TaxYearData, TaxYearRates, YearPrediction } from './types';
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
    savingsInterest: 0,
    pensionContribution: 0,
    capitalGains: 0,
    savedThisMonth: 0,
    hmrcPaymentMade: 0,
    notes: '',
  }));
}

export function createYearData(rates: TaxYearRates, isIndicative = false): TaxYearData {
  return { id: rates.id, rates, months: emptyMonths(), isIndicative, poaOverride: null, prediction: null };
}

/** Splits a whole-year amount evenly across 12 months, putting the rounding remainder in the last month. */
function spreadAcrossMonths(amount: number, monthIndex: number): number {
  const base = Math.floor(amount / 12);
  const remainder = amount - base * 12;
  return monthIndex === 11 ? base + remainder : base;
}

/**
 * Builds a synthetic year from a what-if prediction, spreading the totals
 * evenly across all 12 months, so it can be fed straight into the existing
 * tax/payments-on-account/monthly-progress calculations and produce a
 * smooth month-by-month savings ramp - unlike indicative years (which put
 * everything in one month, since they represent real past data), a forward
 * prediction should ramp evenly since there's no real monthly pattern yet.
 *
 * Carries through the real year's known payment-on-account override, if
 * set - this year's actual POA1/POA2 are already fixed by HMRC regardless
 * of how the rest of the year's income turns out, so the prediction's
 * balancing-payment estimate should use them rather than guessing.
 */
export function buildPredictionYear(prediction: YearPrediction, sourceYear: TaxYearData): TaxYearData {
  const months = emptyMonths().map((m) => ({
    ...m,
    paye: spreadAcrossMonths(prediction.paye, m.monthIndex),
    payeTaxDeducted:
      prediction.payeTaxDeducted === null ? null : spreadAcrossMonths(prediction.payeTaxDeducted, m.monthIndex),
    dividendsEmployment: spreadAcrossMonths(prediction.dividendsEmployment, m.monthIndex),
    dividendsShareDealing: spreadAcrossMonths(prediction.dividendsShareDealing, m.monthIndex),
    otherIncome: spreadAcrossMonths(prediction.otherIncome, m.monthIndex),
    savingsInterest: spreadAcrossMonths(prediction.savingsInterest, m.monthIndex),
    pensionContribution: spreadAcrossMonths(prediction.pensionContribution, m.monthIndex),
    capitalGains: spreadAcrossMonths(prediction.capitalGains, m.monthIndex),
  }));
  return {
    id: sourceYear.id,
    rates: sourceYear.rates,
    months,
    isIndicative: false,
    poaOverride: sourceYear.poaOverride,
    prediction: null,
  };
}

const RATES_FALLBACK_DEFAULTS: Pick<
  TaxYearRates,
  'pensionGrossUpRate' | 'cgtAnnualExemptAmount' | 'cgtRates' | 'savingsStartingRateBandWidth' | 'savingsAllowance'
> = {
  pensionGrossUpRate: 0.2,
  cgtAnnualExemptAmount: 3000,
  cgtRates: { basic: 0.18, higher: 0.24 },
  savingsStartingRateBandWidth: 5000,
  savingsAllowance: { basic: 1000, higher: 500, additional: 0 },
};

const MONTH_FALLBACK_DEFAULTS: Pick<
  MonthlyEntry,
  | 'pensionContribution'
  | 'capitalGains'
  | 'hmrcPaymentMade'
  | 'dividendsEmployment'
  | 'dividendsShareDealing'
  | 'savingsInterest'
> = {
  pensionContribution: 0,
  capitalGains: 0,
  hmrcPaymentMade: 0,
  dividendsEmployment: 0,
  dividendsShareDealing: 0,
  savingsInterest: 0,
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
    const legacyRates = year.rates as unknown as { pensionGiftAidGrossUpRate?: number };
    years[id] = {
      ...year,
      isIndicative: year.isIndicative ?? false,
      poaOverride: year.poaOverride
        ? { ...year.poaOverride, priorYearBalancingPayment: year.poaOverride.priorYearBalancingPayment ?? 0 }
        : null,
      prediction: year.prediction ?? null,
      rates: {
        ...RATES_FALLBACK_DEFAULTS,
        ...year.rates,
        pensionGrossUpRate: year.rates.pensionGrossUpRate ?? legacyRates.pensionGiftAidGrossUpRate ?? 0.2,
      },
      months: year.months.map((m) => migrateMonth(m)),
    };
  }
  return {
    ...state,
    years,
    openingBalance: state.openingBalance ?? null,
    showFollowingYearEstimate: state.showFollowingYearEstimate ?? false,
  };
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
    openingBalance: null,
    showFollowingYearEstimate: false,
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
    ...state,
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
    ...state,
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
  savingsInterest: number;
  pensionContribution: number;
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
        savingsInterest: totals.savingsInterest,
        pensionContribution: totals.pensionContribution,
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
    savingsInterest: bulk.savingsInterest,
    pensionContribution: bulk.pensionContribution,
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
      savingsInterest: totals.savingsInterest,
      pensionContribution: totals.pensionContribution,
      capitalGains: totals.capitalGains,
      savedThisMonth: totals.savedThisMonth,
      hmrcPaymentJan,
      hmrcPaymentJul,
    });
  } else {
    const totals = getIndicativeTotals(year);
    const spread = spreadAcrossMonths;
    months = emptyMonths().map((m) => ({
      ...m,
      paye: spread(totals.paye, m.monthIndex),
      dividendsEmployment: spread(totals.dividendsEmployment, m.monthIndex),
      dividendsShareDealing: spread(totals.dividendsShareDealing, m.monthIndex),
      otherIncome: spread(totals.otherIncome, m.monthIndex),
      savingsInterest: spread(totals.savingsInterest, m.monthIndex),
      pensionContribution: spread(totals.pensionContribution, m.monthIndex),
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
  const openingBalance = state.openingBalance?.yearId === yearId ? null : state.openingBalance;
  return { ...state, years, yearOrder, selectedYearId, openingBalance };
}

/**
 * Sets (or clears, with `balance: null`) the reconciled starting point the
 * Timeline resets its running totals to at the start of the given year -
 * so exact historical figures for every earlier year don't need to be
 * reconstructed, just a known-correct snapshot to carry forward from.
 */
export function setOpeningBalance(state: PlannerState, balance: PlannerState['openingBalance']): PlannerState {
  return { ...state, openingBalance: balance };
}

/**
 * Sets (or clears, with `override: null`) known actual payment-on-account
 * amounts for a year, bypassing the normal calculation from the prior
 * year's liability - for when the prior year isn't on record (or its
 * figures aren't accurate) but HMRC's own statement of the actual POA
 * amounts is known.
 */
export function setPoaOverride(
  state: PlannerState,
  yearId: string,
  override: TaxYearData['poaOverride'],
): PlannerState {
  const year = state.years[yearId];
  if (!year) return state;
  return { ...state, years: { ...state.years, [yearId]: { ...year, poaOverride: override } } };
}

/** Toggles whether the Payments ledger and Timeline show a projected estimate for the year following the latest one on record. */
export function setShowFollowingYearEstimate(state: PlannerState, show: boolean): PlannerState {
  return { ...state, showFollowingYearEstimate: show };
}

/** Sets (or clears, with `prediction: null`) a year's what-if full-year forecast. */
export function setYearPrediction(
  state: PlannerState,
  yearId: string,
  prediction: TaxYearData['prediction'],
): PlannerState {
  const year = state.years[yearId];
  if (!year) return state;
  return { ...state, years: { ...state.years, [yearId]: { ...year, prediction } } };
}

export function exportStateAsJson(state: PlannerState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(json: string): PlannerState {
  const parsed = JSON.parse(json) as PlannerState;
  if (!parsed.years || !parsed.yearOrder) throw new Error('Invalid tax planner file');
  return normalizeState(parsed);
}
