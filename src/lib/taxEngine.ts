import type { TaxYearSettings } from './types';

/** Which UK tax year (by start calendar year, e.g. 2026 for "2026/27") a given date falls in - the tax year runs 6 April to 5 April. */
export function taxYearStartForDate(date: Date): number {
  const year = date.getFullYear();
  const aprilSixth = new Date(year, 3, 6);
  return date >= aprilSixth ? year : year - 1;
}

export function taxYearId(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * Default rest-of-UK (England/Wales/NI) self-employment tax settings.
 * Personal allowance and the higher/additional-rate thresholds are frozen
 * by government policy through 2027/28, and Class 4 NIC rates have been
 * stable since April 2024 - editable per year once actual figures for a
 * later year are confirmed.
 */
export function defaultTaxYearSettings(startYear: number): TaxYearSettings {
  return {
    id: taxYearId(startYear),
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
    startDate: `${startYear}-04-06`,
    endDate: `${startYear + 1}-04-05`,
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    additionalRateThreshold: 125140,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,
    tradingAllowance: 1000,
    class4LowerLimit: 12570,
    class4UpperLimit: 50270,
    class4LowerRate: 0.06,
    class4UpperRate: 0.02,
    expensesToDate: 0,
    projectedFullYearExpenses: 0,
  };
}

/** The larger of actual recorded expenses or the tax-free trading allowance, since claiming both isn't allowed. */
export function deductibleAmount(expenses: number, settings: TaxYearSettings): number {
  return Math.max(expenses, settings.tradingAllowance);
}

export function taxableProfit(income: number, expenses: number, settings: TaxYearSettings): number {
  return Math.max(0, income - deductibleAmount(expenses, settings));
}

/** Income Tax on trading profit alone - assumes no other income sources and doesn't apply the personal allowance taper above £100,000. */
export function incomeTaxOnProfit(profit: number, settings: TaxYearSettings): number {
  const taxable = Math.max(0, profit - settings.personalAllowance);
  if (taxable <= 0) return 0;

  const basicBand = Math.min(taxable, settings.basicRateBandWidth);
  let tax = basicBand * settings.basicRate;
  let remaining = taxable - basicBand;
  if (remaining <= 0) return tax;

  const higherBandWidth = Math.max(0, settings.additionalRateThreshold - (settings.personalAllowance + settings.basicRateBandWidth));
  const higherBand = Math.min(remaining, higherBandWidth);
  tax += higherBand * settings.higherRate;
  remaining -= higherBand;
  if (remaining > 0) tax += remaining * settings.additionalRate;
  return tax;
}

/** Class 4 National Insurance on trading profit - 6% between the lower and upper limits, 2% above. Class 2 NIC is no longer compulsory for most self-employed people since April 2024. */
export function class4NicOnProfit(profit: number, settings: TaxYearSettings): number {
  if (profit <= settings.class4LowerLimit) return 0;
  const lowerBand = Math.min(profit, settings.class4UpperLimit) - settings.class4LowerLimit;
  let nic = lowerBand * settings.class4LowerRate;
  if (profit > settings.class4UpperLimit) {
    nic += (profit - settings.class4UpperLimit) * settings.class4UpperRate;
  }
  return nic;
}

export interface TaxLiability {
  income: number;
  expenses: number;
  deduction: number;
  profit: number;
  incomeTax: number;
  class4Nic: number;
  total: number;
}

export function computeTaxLiability(income: number, expenses: number, settings: TaxYearSettings): TaxLiability {
  const deduction = deductibleAmount(expenses, settings);
  const profit = taxableProfit(income, expenses, settings);
  const incomeTax = incomeTaxOnProfit(profit, settings);
  const class4Nic = class4NicOnProfit(profit, settings);
  return { income, expenses, deduction, profit, incomeTax, class4Nic, total: incomeTax + class4Nic };
}
