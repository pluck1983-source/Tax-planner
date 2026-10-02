import { describe, expect, it } from 'vitest';
import { getDefaultRatesForYear } from './defaultRates';
import { importStateFromJson } from './storage';
import { calculateIncomeTax } from './taxEngine';

describe('dividend rates', () => {
  it('uses the 2 point higher ordinary and upper rates from 2026/27', () => {
    expect(getDefaultRatesForYear(2025).dividendRates).toEqual({ basic: 0.0875, higher: 0.3375, additional: 0.3935 });
    expect(getDefaultRatesForYear(2026).dividendRates).toEqual({ basic: 0.1075, higher: 0.3575, additional: 0.3935 });
    // Years beyond the hard-coded list must not fall back to the old rates.
    expect(getDefaultRatesForYear(2028).dividendRates.basic).toBe(0.1075);
    expect(getDefaultRatesForYear(2022).dividendRates.basic).toBe(0.0875);
  });

  it('taxes a low-salary-plus-dividends director at the new rates in 2026/27', () => {
    // £12,570 salary uses the personal allowance. Of £40,000 dividends, £500 is
    // the allowance, £37,200 fills the rest of the basic band and £2,300 is higher rate.
    const result = calculateIncomeTax(getDefaultRatesForYear(2026), 12570, 0, 40000, { pensionContribution: 0 });
    expect(result.dividendTax).toBeCloseTo(37200 * 0.1075 + 2300 * 0.3575, 2);
    const before = calculateIncomeTax(getDefaultRatesForYear(2025), 12570, 0, 40000, { pensionContribution: 0 });
    expect(result.dividendTax - before.dividendTax).toBeCloseTo(790, 2);
  });
});

describe('migrating saved data', () => {
  function savedState(yearId: string, dividendRates: object) {
    const startYear = Number(yearId.split('-')[0]);
    const rates = { ...getDefaultRatesForYear(startYear), dividendRates };
    return JSON.stringify({
      years: { [yearId]: { id: yearId, rates, months: [], isIndicative: false, poaOverride: null, prediction: null } },
      yearOrder: [yearId],
      selectedYearId: yearId,
    });
  }
  const old = { basic: 0.0875, higher: 0.3375, additional: 0.3935 };

  it('moves an unedited 2026/27 year onto the new rates', () => {
    const state = importStateFromJson(savedState('2026-27', old));
    expect(state.years['2026-27'].rates.dividendRates).toEqual({ basic: 0.1075, higher: 0.3575, additional: 0.3935 });
  });

  it('leaves earlier years and hand-edited rates alone', () => {
    expect(importStateFromJson(savedState('2025-26', old)).years['2025-26'].rates.dividendRates).toEqual(old);
    const custom = { basic: 0.1, higher: 0.3375, additional: 0.3935 };
    expect(importStateFromJson(savedState('2026-27', custom)).years['2026-27'].rates.dividendRates).toEqual(custom);
  });
});
