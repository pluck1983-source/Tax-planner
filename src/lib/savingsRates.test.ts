import { describe, expect, it } from 'vitest';
import { getDefaultRatesForYear } from './defaultRates';
import { addNewYear, importStateFromJson } from './storage';
import { calculateIncomeTax } from './taxEngine';
import type { PlannerState } from './types';

describe('savings interest rates', () => {
  it('uses the salary rates up to 2026/27 and 2 points more from 2027/28', () => {
    expect(getDefaultRatesForYear(2026).savingsRates).toEqual({ basic: 0.2, higher: 0.4, additional: 0.45 });
    expect(getDefaultRatesForYear(2027).savingsRates).toEqual({ basic: 0.22, higher: 0.42, additional: 0.47 });
    expect(getDefaultRatesForYear(2030).savingsRates.basic).toBe(0.22);
    // Salary rates are unchanged.
    expect(getDefaultRatesForYear(2027).nonDividendRates).toEqual({ basic: 0.2, higher: 0.4, additional: 0.45 });
  });

  it('taxes a basic-rate saver at 22% in 2027/28', () => {
    // £30,000 salary uses the PA and £17,430 of the basic band. £3,000 interest:
    // no starting rate (salary well over £17,570), £1,000 PSA, £2,000 taxed.
    const later = calculateIncomeTax(getDefaultRatesForYear(2027), 30000, 3000, 0, { pensionContribution: 0 });
    expect(later.savingsTax).toBeCloseTo(440, 2);
    const before = calculateIncomeTax(getDefaultRatesForYear(2026), 30000, 3000, 0, { pensionContribution: 0 });
    expect(before.savingsTax).toBeCloseTo(400, 2);
    expect(later.nonDividendTax).toBeCloseTo(before.nonDividendTax, 2);
    expect(later.totalTax - before.totalTax).toBeCloseTo(40, 2);
  });

  it('taxes interest across the higher-rate boundary at 22% and 42%', () => {
    // £48,000 salary leaves £2,270 of basic band. £5,000 interest: the £500
    // PSA (higher-rate taxpayer) uses band space first, then £1,770 at 22%
    // and £2,730 at 42%.
    const result = calculateIncomeTax(getDefaultRatesForYear(2027), 48000, 5000, 0, { pensionContribution: 0 });
    expect(result.savingsTax).toBeCloseTo(1770 * 0.22 + 2730 * 0.42, 2);
  });
});

describe('savings rates in saved and new years', () => {
  function savedState(yearId: string, mutate: (rates: Record<string, unknown>) => void) {
    const startYear = Number(yearId.split('-')[0]);
    const rates: Record<string, unknown> = { ...getDefaultRatesForYear(startYear) };
    mutate(rates);
    return JSON.stringify({
      years: { [yearId]: { id: yearId, rates, months: [], isIndicative: false, poaOverride: null, prediction: null } },
      yearOrder: [yearId],
      selectedYearId: yearId,
    });
  }

  it('gives a saved 2027/28 year without savings rates the new ones', () => {
    const state = importStateFromJson(savedState('2027-28', (r) => delete r.savingsRates));
    expect(state.years['2027-28'].rates.savingsRates).toEqual({ basic: 0.22, higher: 0.42, additional: 0.47 });
  });

  it('keeps a saved 2025/26 year on the salary rates', () => {
    const state = importStateFromJson(savedState('2025-26', (r) => delete r.savingsRates));
    expect(state.years['2025-26'].rates.savingsRates).toEqual({ basic: 0.2, higher: 0.4, additional: 0.45 });
  });

  it('keeps hand-edited savings rates', () => {
    const edited = { basic: 0.25, higher: 0.42, additional: 0.47 };
    const state = importStateFromJson(savedState('2027-28', (r) => (r.savingsRates = edited)));
    expect(state.years['2027-28'].rates.savingsRates).toEqual(edited);
  });

  it('applies the rise when 2027/28 copies an edited 2026/27', () => {
    const state = importStateFromJson(savedState('2026-27', (r) => (r.personalAllowance = 13000)));
    const next: PlannerState = addNewYear(state);
    expect(next.years['2027-28'].rates.savingsRates).toEqual({ basic: 0.22, higher: 0.42, additional: 0.47 });
    // Other figures carry forward as before.
    expect(next.years['2027-28'].rates.personalAllowance).toBe(13000);
    expect(next.years['2027-28'].rates.nonDividendRates.basic).toBe(0.2);
  });
});
