import { describe, expect, it } from 'vitest';
import { getDefaultRatesForYear } from './defaultRates';
import { emptyMonths } from './storage';
import {
  calculateCapitalGainsTax,
  calculateExpectedHmrcPayment,
  calculateIncomeTax,
  calculateMonthlyProgress,
  calculatePaymentsOnAccount,
  calculateYearLiability,
} from './taxEngine';
import type { MonthlyEntry, PlannerState, PoaOverride, TaxYearData } from './types';

// Hand-worked examples using 2025/26 rest-of-UK rates: PA £12,570 (tapered
// £1 per £2 over £100,000), basic band £37,700, additional rate on taxable
// income over £125,140, dividend allowance £500, dividends 8.75/33.75/39.35%.
const r25 = getDefaultRatesForYear(2025);
const tax = (salary: number, savings = 0, dividends = 0, pensionNet = 0) =>
  calculateIncomeTax(r25, salary, savings, dividends, { pensionContribution: pensionNet });

describe('income tax on salary', () => {
  it('basic rate', () => expect(tax(50000).totalTax).toBeCloseTo((50000 - 12570) * 0.2, 2));
  it('higher rate', () => expect(tax(60000).totalTax).toBeCloseTo(37700 * 0.2 + 9730 * 0.4, 2));
  it('tapers the personal allowance above £100k', () => {
    // PA 12,570 - 5,000 = 7,570; taxable 102,430
    const result = tax(110000);
    expect(result.personalAllowance).toBe(7570);
    expect(result.totalTax).toBeCloseTo(37700 * 0.2 + 64730 * 0.4, 2);
  });
  it('additional rate above £125,140', () =>
    expect(tax(130000).totalTax).toBeCloseTo(37700 * 0.2 + 87440 * 0.4 + 4860 * 0.45, 2));
});

describe('dividends', () => {
  it('low salary plus dividends crossing into higher rate', () =>
    // 500 at 0%, 37,200 at 8.75%, 12,300 at 33.75%
    expect(tax(12570, 0, 50000).dividendTax).toBeCloseTo(37200 * 0.0875 + 12300 * 0.3375, 2));
  it('unused personal allowance shelters dividends', () =>
    // 4,570 of PA left after an £8,000 salary: 15,430 taxable, 500 of it at 0%
    expect(tax(8000, 0, 20000).totalTax).toBeCloseTo(14930 * 0.0875, 2));
});

describe('savings interest', () => {
  it('basic-rate taxpayer gets a £1,000 Personal Savings Allowance', () =>
    expect(tax(30000, 3000).savingsTax).toBeCloseTo(2000 * 0.2, 2));
  it('starting rate for savings is reduced by taxable non-savings income', () => {
    // taxable salary 1,430 leaves 3,570 starting rate, plus 1,000 PSA: 4,570 at 0%
    const result = tax(14000, 6000);
    expect(result.startingRateForSavingsRemaining).toBe(3570);
    expect(result.savingsTax).toBeCloseTo(1430 * 0.2, 2);
  });
  it('higher-rate taxpayer gets £500 PSA', () => expect(tax(60000, 2000).savingsTax).toBeCloseTo(1500 * 0.4, 2));
  it('additional-rate taxpayer gets no PSA', () => expect(tax(130000, 1000).savingsTax).toBeCloseTo(1000 * 0.45, 2));
});

describe('relief-at-source pension contributions', () => {
  it('extend the basic-rate band by the grossed-up contribution', () =>
    // £8,000 net = £10,000 gross: basic band 47,700 covers all 47,430 taxable
    expect(tax(60000, 0, 0, 8000).totalTax).toBeCloseTo(47430 * 0.2, 2));

  it('also extend the higher-rate limit for an additional-rate taxpayer', () => {
    // £130k salary, £10k gross pension: ANI 120k so PA 2,570; taxable 127,430.
    // Basic band 47,700, higher-rate limit 125,140 + 10,000 = 135,140, so no 45% tax.
    const result = tax(130000, 0, 0, 8000);
    expect(result.personalAllowance).toBe(2570);
    expect(result.totalTax).toBeCloseTo(47700 * 0.2 + 79730 * 0.4, 2);
  });

  it('give additional-rate relief once income is above the extended limit', () => {
    // £200k salary, £10k gross: PA 0; basic 47,700; higher to 135,140; rest at 45%
    expect(tax(200000, 0, 0, 8000).totalTax).toBeCloseTo(47700 * 0.2 + 87440 * 0.4 + 64860 * 0.45, 2);
  });

  it('decide the Personal Savings Allowance using the extended limits', () => {
    // Taxable 127,430 is below the extended 135,140 limit, so this is a higher-rate taxpayer: £500 PSA
    expect(tax(130000, 1000, 0, 8000).personalSavingsAllowance).toBe(500);
  });
});

describe('capital gains', () => {
  it('gains within the remaining basic band are taxed at 18%', () => {
    const remaining = tax(30000).remainingBasicRateBandWidth; // 37,700 - 17,430
    expect(remaining).toBe(20270);
    expect(calculateCapitalGainsTax(r25, 20000, remaining).tax).toBeCloseTo(17000 * 0.18, 2);
  });
  it('gains spanning the band split between 18% and 24%', () => {
    const remaining = tax(45000).remainingBasicRateBandWidth; // 5,270
    expect(calculateCapitalGainsTax(r25, 13000, remaining).tax).toBeCloseTo(5270 * 0.18 + 4730 * 0.24, 2);
  });
});

function month(index: number, patch: Partial<MonthlyEntry> = {}): MonthlyEntry {
  return { ...emptyMonths()[index], ...patch };
}

/** A year with the same salary/dividends every month */
function monthlyYear(startYear: number, salary: number, dividends: number, poaOverride: PoaOverride | null = null): TaxYearData {
  const rates = getDefaultRatesForYear(startYear);
  return {
    id: rates.id,
    rates,
    months: emptyMonths().map((m) => month(m.monthIndex, { paye: salary / 12, dividendsEmployment: dividends / 12 })),
    isIndicative: false,
    poaOverride,
    prediction: null,
  };
}

/** A yearly-totals year: everything in the April slot */
function indicativeYear(startYear: number, salary: number, dividends: number): TaxYearData {
  const rates = getDefaultRatesForYear(startYear);
  return {
    id: rates.id,
    rates,
    months: emptyMonths().map((m) => (m.monthIndex === 0 ? month(0, { paye: salary, dividendsEmployment: dividends }) : m)),
    isIndicative: true,
    poaOverride: null,
    prediction: null,
  };
}

describe('PAYE estimate when tax deducted is left blank', () => {
  it('treats each month of a monthly year as one twelfth of an annual salary', () => {
    // £48,000 a year: PAYE (48,000 - 12,570) x 20% = 7,086
    const liability = calculateYearLiability(monthlyYear(2025, 48000, 0));
    expect(liability.totals.payeTaxDeducted).toBeCloseTo(7086, 0);
    expect(liability.incomeTaxSelfAssessmentLiability).toBeCloseTo(0, 0);
  });
  it('treats an indicative year as a whole-year salary', () => {
    const liability = calculateYearLiability(indicativeYear(2025, 48000, 0));
    expect(liability.totals.payeTaxDeducted).toBeCloseTo(7086, 0);
  });
});

describe('payments on account', () => {
  it('are half the prior year self-assessment bill, due 31 Jan and 31 Jul', () => {
    const prior = monthlyYear(2025, 12570, 50000); // SA 7,406.25, no PAYE
    const schedule = calculatePaymentsOnAccount(monthlyYear(2026, 12570, 50000), prior);
    expect(schedule.required).toBe(true);
    expect(schedule.poa1).toMatchObject({ dueDate: '2027-01-31' });
    expect(schedule.poa1!.amount).toBeCloseTo(7406.25 / 2, 2);
    expect(schedule.poa2).toMatchObject({ dueDate: '2027-07-31' });
    expect(schedule.balancingPayment.dueDate).toBe('2028-01-31');
    // 2026/27 at the new rates: 37,200 x 10.75% + 12,300 x 35.75%
    const current2026 = 37200 * 0.1075 + 12300 * 0.3575;
    expect(schedule.balancingPayment.amount).toBeCloseTo(current2026 - 7406.25, 2);
  });
  it('are not needed when the prior bill was £1,000 or less', () => {
    const prior = monthlyYear(2025, 12570, 10000); // 9,500 x 8.75% = 831.25
    expect(calculatePaymentsOnAccount(monthlyYear(2026, 12570, 10000), prior).required).toBe(false);
  });
  it('are not needed when 80% or more was collected through PAYE', () => {
    // £100k salary + £3.5k dividends: PA tapers to 10,820, total tax 29,144.50,
    // PAYE (full PA) 27,432 - 94% collected, so no POAs despite a £1,712.50 bill
    const prior = indicativeYear(2025, 100000, 3500);
    const priorLiability = calculateYearLiability(prior);
    expect(priorLiability.taxBreakdown.totalTax).toBeCloseTo(29144.5, 2);
    expect(priorLiability.incomeTaxSelfAssessmentLiability).toBeCloseTo(1712.5, 2);
    expect(calculatePaymentsOnAccount(indicativeYear(2026, 100000, 3500), prior).required).toBe(false);
  });
});

describe('expected January payment', () => {
  it('includes a known balancing payment for an untracked earlier year', () => {
    const year = monthlyYear(2026, 12570, 50000, { poa1: 3000, poa2: 3000, priorYearBalancingPayment: 1200 });
    const state: PlannerState = {
      years: { [year.id]: year },
      yearOrder: [year.id],
      selectedYearId: year.id,
      openingBalance: null,
      showFollowingYearEstimate: false,
    };
    expect(calculateExpectedHmrcPayment(state, year.id, 9)).toBe(4200);
  });
});

describe('monthly savings target', () => {
  const year = monthlyYear(2026, 12570, 50000);
  const fullBill = calculateYearLiability(year).totalSelfAssessmentLiability;
  const progress = calculateMonthlyProgress(year);

  it('reaches the full-year bill by March', () => expect(progress[11].cumulativeTargetLiability).toBeCloseTo(fullBill, 2));

  it('builds up evenly through the year for steady income', () => {
    // 6/12 of the bill by September, not the tax on six months' income alone
    expect(progress[5].cumulativeTargetLiability).toBeCloseTo(fullBill / 2, 2);
    expect(progress[0].cumulativeTargetLiability).toBeCloseTo(fullBill / 12, 2);
  });

  it('adds CGT in full in the month the gain is made', () => {
    const withGain: TaxYearData = {
      ...year,
      months: year.months.map((m) => (m.monthIndex === 2 ? { ...m, capitalGains: 13000 } : m)),
    };
    const gainProgress = calculateMonthlyProgress(withGain);
    const cgt = calculateYearLiability(withGain).capitalGains.tax;
    expect(cgt).toBeGreaterThan(0);
    expect(gainProgress[2].cumulativeTargetLiability - progress[2].cumulativeTargetLiability).toBeCloseTo(cgt, 2);
  });

  it('asks for the whole bill from April on an indicative year', () => {
    const indicative = indicativeYear(2026, 12570, 50000);
    const bill = calculateYearLiability(indicative).totalSelfAssessmentLiability;
    expect(calculateMonthlyProgress(indicative)[0].cumulativeTargetLiability).toBeCloseTo(bill, 2);
  });
});
