import type { MonthlyEntry, PlannerState, TaxYearData, TaxYearRates } from './types';
import { MONTH_LABELS } from './types';
import { startYearFromYearId, yearIdFromStartYear } from './defaultRates';

export interface Band {
  width: number; // Infinity for the top band
  rate: number;
}

/**
 * Consume `amount` through a waterfall of bands, returning tax due and the
 * amount used in each band. Always produces one entry per band (0 for bands
 * not reached) so callers can index perBand[i] against the original bands
 * array without gaps.
 */
function taxThroughBands(amount: number, bands: Band[]): { tax: number; perBand: number[] } {
  let remaining = amount;
  let tax = 0;
  const perBand: number[] = [];
  for (const band of bands) {
    const used = Math.max(0, Math.min(remaining, band.width));
    tax += used * band.rate;
    perBand.push(used);
    remaining -= used;
  }
  return { tax, perBand };
}

/** Personal allowance after tapering, based on adjusted net income (net of pension/Gift Aid grossing up). */
export function personalAllowanceFor(rates: TaxYearRates, adjustedNetIncome: number): number {
  const excess = Math.max(0, adjustedNetIncome - rates.paTaperThreshold);
  const reduction = excess * rates.paTaperRate;
  return Math.max(0, rates.personalAllowance - reduction);
}

export interface IncomeReliefs {
  /** Net amount paid into a relief-at-source personal pension (e.g. a SIPP) */
  pensionContribution: number;
  /** Net Gift Aid donations */
  giftAid: number;
}

export interface IncomeTaxBreakdown {
  totalIncome: number;
  adjustedNetIncome: number;
  personalAllowance: number;
  /** Basic-rate band width after extending it for grossed-up pension contributions and Gift Aid */
  extendedBasicRateBandWidth: number;
  /** How much of the extended basic-rate band is left after non-dividend, savings and dividend income - available to CGT at the lower rate */
  remainingBasicRateBandWidth: number;
  /** Starting rate for savings band remaining after non-savings income (0 if non-savings income already uses it all up) */
  startingRateForSavingsRemaining: number;
  /** Personal Savings Allowance available, based on which band total income falls into */
  personalSavingsAllowance: number;
  nonDividendTax: number;
  savingsTax: number;
  dividendTax: number;
  totalTax: number;
}

/**
 * Computes total UK income tax for a tax year given non-dividend,
 * non-savings income (salary + other taxable income, stacked first),
 * untaxed savings interest (stacked next), and dividend income (stacked
 * last, after the personal allowance and other bands are used up).
 *
 * Personal pension contributions (relief at source) and Gift Aid donations
 * both extend the basic-rate (and therefore higher-rate) band by their
 * grossed-up value, and reduce adjusted net income for the personal
 * allowance taper - giving higher/additional rate relief on top of the
 * basic-rate relief already added by the pension provider/charity.
 */
export function calculateIncomeTax(
  rates: TaxYearRates,
  nonDividendIncome: number,
  savingsIncome: number,
  dividendIncome: number,
  reliefs: IncomeReliefs = { pensionContribution: 0, giftAid: 0 },
): IncomeTaxBreakdown {
  const totalIncome =
    Math.max(0, nonDividendIncome) + Math.max(0, savingsIncome) + Math.max(0, dividendIncome);
  const grossUpRate = rates.pensionGiftAidGrossUpRate;
  const grossPension = Math.max(0, reliefs.pensionContribution) / (1 - grossUpRate);
  const grossGiftAid = Math.max(0, reliefs.giftAid) / (1 - grossUpRate);
  const extendedBasicRateBandWidth = rates.basicRateBandWidth + grossPension + grossGiftAid;

  const adjustedNetIncome = Math.max(0, totalIncome - grossPension - grossGiftAid);
  const pa = personalAllowanceFor(rates, adjustedNetIncome);

  const bandsFor = (rateSet: { basic: number; higher: number; additional: number }): Band[] => [
    { width: extendedBasicRateBandWidth, rate: rateSet.basic },
    {
      width: Math.max(0, rates.additionalRateThreshold - pa - extendedBasicRateBandWidth),
      rate: rateSet.higher,
    },
    { width: Infinity, rate: rateSet.additional },
  ];

  const taxableNonDividend = Math.max(0, nonDividendIncome - pa);
  const nonDividendResult = taxThroughBands(taxableNonDividend, bandsFor(rates.nonDividendRates));

  // Any personal allowance left unused by non-dividend income carries forward
  // to reduce savings income first, then dividend income - PA isn't wasted
  // just because non-dividend income alone doesn't use it all up.
  const unusedPaAfterNonDividend = Math.max(0, pa - Math.max(0, nonDividendIncome));
  const savings = Math.max(0, savingsIncome);
  const taxableSavings = Math.max(0, savings - unusedPaAfterNonDividend);

  // Savings interest stacks on top of non-savings income, using the same
  // basic/higher/additional rates and whatever band capacity remains.
  const bandsAfterNonDividend = bandsFor(rates.nonDividendRates).map((band, i) => ({
    ...band,
    width: Math.max(0, band.width - nonDividendResult.perBand[i]),
  }));

  const { perBand: savingsPerBand } = taxThroughBands(taxableSavings, bandsAfterNonDividend);

  // Starting rate for savings: up to £5,000 at 0%, reduced £1 for £1 by
  // non-savings income already using up that space in the basic band.
  const startingRateForSavingsRemaining = Math.max(0, rates.savingsStartingRateBandWidth - taxableNonDividend);

  // Personal Savings Allowance depends on which band total income falls into.
  const higherRateStart = pa + extendedBasicRateBandWidth;
  const personalSavingsAllowance =
    totalIncome <= higherRateStart
      ? rates.savingsAllowance.basic
      : totalIncome <= rates.additionalRateThreshold
        ? rates.savingsAllowance.higher
        : rates.savingsAllowance.additional;

  // Both nil-rate amounts are applied from the lowest band first; they still
  // "use up" band capacity but are taxed at 0% rather than the band's rate.
  let savingsNilRateLeft = startingRateForSavingsRemaining + personalSavingsAllowance;
  let savingsTax = 0;
  savingsPerBand.forEach((amountInBand, i) => {
    const nilRated = Math.min(savingsNilRateLeft, amountInBand);
    savingsNilRateLeft -= nilRated;
    const taxable = amountInBand - nilRated;
    savingsTax += taxable * bandsAfterNonDividend[i].rate;
  });

  // Dividends stack last, using whatever band capacity remains after both
  // non-dividend and savings income.
  const remainingBands = bandsFor(rates.dividendRates).map((band, i) => ({
    ...band,
    width: Math.max(0, band.width - nonDividendResult.perBand[i] - savingsPerBand[i]),
  }));

  const unusedPaAfterSavings = Math.max(0, unusedPaAfterNonDividend - savings);
  const dividends = Math.max(0, dividendIncome);
  const taxableDividends = Math.max(0, dividends - unusedPaAfterSavings);
  const { perBand: divPerBand } = taxThroughBands(taxableDividends, remainingBands);

  // Apply the dividend nil-rate allowance to the lowest bands first; it still
  // "uses up" band capacity but is taxed at 0% rather than the band's rate.
  let allowanceLeft = rates.dividendAllowance;
  let dividendTax = 0;
  divPerBand.forEach((amountInBand, i) => {
    const nilRated = Math.min(allowanceLeft, amountInBand);
    allowanceLeft -= nilRated;
    const taxable = amountInBand - nilRated;
    dividendTax += taxable * remainingBands[i].rate;
  });

  const remainingBasicRateBandWidth = Math.max(
    0,
    extendedBasicRateBandWidth - nonDividendResult.perBand[0] - savingsPerBand[0] - divPerBand[0],
  );

  return {
    totalIncome,
    adjustedNetIncome,
    personalAllowance: pa,
    extendedBasicRateBandWidth,
    remainingBasicRateBandWidth,
    startingRateForSavingsRemaining,
    personalSavingsAllowance,
    nonDividendTax: nonDividendResult.tax,
    savingsTax,
    dividendTax,
    totalTax: nonDividendResult.tax + savingsTax + dividendTax,
  };
}

/** Estimates PAYE tax that would be withheld on salary alone under a standard tax code. */
export function estimatePayeTax(rates: TaxYearRates, salary: number): number {
  return calculateIncomeTax(rates, salary, 0, 0).nonDividendTax;
}

export interface CapitalGainsBreakdown {
  netGains: number;
  taxableGains: number;
  tax: number;
}

/**
 * Capital Gains Tax stacks on top of income for band purposes: gains that
 * fall within whatever's left of the basic-rate band (after income tax) are
 * taxed at the lower CGT rate, the rest at the higher rate. CGT is entirely
 * separate from income tax - it has its own annual exempt amount and isn't
 * collected via PAYE or included in payments on account.
 */
export function calculateCapitalGainsTax(
  rates: TaxYearRates,
  netGains: number,
  remainingBasicRateBandWidth: number,
): CapitalGainsBreakdown {
  const taxableGains = Math.max(0, netGains - rates.cgtAnnualExemptAmount);
  const { tax } = taxThroughBands(taxableGains, [
    { width: remainingBasicRateBandWidth, rate: rates.cgtRates.basic },
    { width: Infinity, rate: rates.cgtRates.higher },
  ]);
  return { netGains, taxableGains, tax };
}

export interface MonthlyTotals {
  paye: number;
  payeTaxDeducted: number;
  dividendsEmployment: number;
  dividendsShareDealing: number;
  otherIncome: number;
  savingsInterest: number;
  pensionContribution: number;
  giftAid: number;
  capitalGains: number;
  savedThisMonth: number;
  hmrcPaymentMade: number;
}

/** Total dividends regardless of source - UK dividend tax doesn't distinguish where they came from. */
export function totalDividends(totals: MonthlyTotals): number {
  return totals.dividendsEmployment + totals.dividendsShareDealing;
}

export function sumMonths(months: MonthlyEntry[], rates: TaxYearRates, uptoIndex?: number): MonthlyTotals {
  const slice = uptoIndex === undefined ? months : months.filter((m) => m.monthIndex <= uptoIndex);
  return slice.reduce<MonthlyTotals>(
    (acc, m) => ({
      paye: acc.paye + m.paye,
      payeTaxDeducted:
        acc.payeTaxDeducted + (m.payeTaxDeducted ?? estimatePayeTax(rates, m.paye)),
      dividendsEmployment: acc.dividendsEmployment + m.dividendsEmployment,
      dividendsShareDealing: acc.dividendsShareDealing + m.dividendsShareDealing,
      otherIncome: acc.otherIncome + m.otherIncome,
      savingsInterest: acc.savingsInterest + m.savingsInterest,
      pensionContribution: acc.pensionContribution + m.pensionContribution,
      giftAid: acc.giftAid + m.giftAid,
      capitalGains: acc.capitalGains + m.capitalGains,
      savedThisMonth: acc.savedThisMonth + m.savedThisMonth,
      hmrcPaymentMade: acc.hmrcPaymentMade + m.hmrcPaymentMade,
    }),
    {
      paye: 0,
      payeTaxDeducted: 0,
      dividendsEmployment: 0,
      dividendsShareDealing: 0,
      otherIncome: 0,
      savingsInterest: 0,
      pensionContribution: 0,
      giftAid: 0,
      capitalGains: 0,
      savedThisMonth: 0,
      hmrcPaymentMade: 0,
    },
  );
}

export interface YearLiability {
  totals: MonthlyTotals;
  taxBreakdown: IncomeTaxBreakdown;
  capitalGains: CapitalGainsBreakdown;
  /** Income tax owed on top of what was collected via PAYE - the self-assessment "relevant amount" used for payments on account */
  incomeTaxSelfAssessmentLiability: number;
  /** Income tax self-assessment liability plus CGT - the total owed via self-assessment for the year */
  totalSelfAssessmentLiability: number;
}

function computeReliefsAndCalc(year: TaxYearData, totals: MonthlyTotals) {
  const nonDividendIncome = totals.paye + totals.otherIncome;
  const reliefs: IncomeReliefs = {
    pensionContribution: totals.pensionContribution,
    giftAid: totals.giftAid,
  };
  const taxBreakdown = calculateIncomeTax(
    year.rates,
    nonDividendIncome,
    totals.savingsInterest,
    totalDividends(totals),
    reliefs,
  );
  const capitalGains = calculateCapitalGainsTax(
    year.rates,
    totals.capitalGains,
    taxBreakdown.remainingBasicRateBandWidth,
  );
  return { taxBreakdown, capitalGains };
}

export function calculateYearLiability(year: TaxYearData): YearLiability {
  const totals = sumMonths(year.months, year.rates);
  const { taxBreakdown, capitalGains } = computeReliefsAndCalc(year, totals);
  const incomeTaxSelfAssessmentLiability = Math.max(0, taxBreakdown.totalTax - totals.payeTaxDeducted);
  const totalSelfAssessmentLiability = incomeTaxSelfAssessmentLiability + capitalGains.tax;
  return { totals, taxBreakdown, capitalGains, incomeTaxSelfAssessmentLiability, totalSelfAssessmentLiability };
}

export interface PaymentEvent {
  label: string;
  dueDate: string;
  amount: number;
  yearId: string;
}

export interface PaymentsOnAccountSchedule {
  required: boolean;
  poa1: PaymentEvent | null;
  poa2: PaymentEvent | null;
  balancingPayment: PaymentEvent;
  totalDueForYear: number;
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the (likely) payments on account and balancing payment for a
 * given tax year, based on that year's own liability and the prior year's
 * liability (POAs are always set from the prior year's self-assessment bill).
 *
 * If the year has a known POA override set (e.g. because the prior year
 * isn't on record but HMRC's own statement of the actual amounts is known),
 * that's used instead of calculating from the prior year.
 *
 * Payments on account are based on income tax only - HMRC excludes Capital
 * Gains Tax from the POA calculation entirely. Any CGT owed is instead added
 * in full to the balancing payment.
 */
export function calculatePaymentsOnAccount(
  currentYear: TaxYearData,
  priorYear: TaxYearData | null,
): PaymentsOnAccountSchedule {
  const current = calculateYearLiability(currentYear);
  const jan31 = addYears(currentYear.rates.startDate, 1).replace(/\d{2}-\d{2}$/, '01-31');
  const jul31 = jan31.replace('01-31', '07-31');
  const balancingDueDate = addYears(jan31, 1);

  let poaRequired = false;
  let poa1Amount = 0;
  let poa2Amount = 0;
  if (currentYear.poaOverride) {
    poaRequired = true;
    poa1Amount = currentYear.poaOverride.poa1;
    poa2Amount = currentYear.poaOverride.poa2;
  } else if (priorYear) {
    const prior = calculateYearLiability(priorYear);
    const collectedFraction =
      prior.taxBreakdown.totalTax > 0 ? prior.totals.payeTaxDeducted / prior.taxBreakdown.totalTax : 1;
    poaRequired =
      prior.incomeTaxSelfAssessmentLiability > currentYear.rates.poaThreshold &&
      collectedFraction < currentYear.rates.poaSourceCollectionFraction;
    if (poaRequired) poa1Amount = poa2Amount = prior.incomeTaxSelfAssessmentLiability / 2;
  }

  const poa1: PaymentEvent | null = poaRequired
    ? { label: 'Payment on account 1', dueDate: jan31, amount: poa1Amount, yearId: currentYear.id }
    : null;
  const poa2: PaymentEvent | null = poaRequired
    ? { label: 'Payment on account 2', dueDate: jul31, amount: poa2Amount, yearId: currentYear.id }
    : null;

  const poaPaid = poa1Amount + poa2Amount;
  // Balancing payment reconciles income tax against POAs already paid, then adds CGT in full (CGT is never part of POA).
  const balancingAmount = current.incomeTaxSelfAssessmentLiability - poaPaid + current.capitalGains.tax;

  const balancingPayment: PaymentEvent = {
    label: 'Balancing payment',
    dueDate: balancingDueDate,
    amount: balancingAmount,
    yearId: currentYear.id,
  };

  return {
    required: poaRequired,
    poa1,
    poa2,
    balancingPayment,
    totalDueForYear: poaPaid + balancingAmount,
  };
}

/**
 * The amount HMRC would actually expect on a given month, for showing as a
 * placeholder next to the "paid to HMRC" field. Only January (payment on
 * account 1 for this year + the prior year's balancing payment, both due
 * 31 Jan) and July (the prior year's payment on account 2, due 31 Jul)
 * ever have anything due - every other month returns 0.
 */
export function calculateExpectedHmrcPayment(
  state: PlannerState,
  yearId: string,
  monthIndex: number,
): number {
  const year = state.years[yearId];
  if (!year || (monthIndex !== 9 && monthIndex !== 3)) return 0;

  const startYear = startYearFromYearId(yearId);
  const priorYear = state.years[yearIdFromStartYear(startYear - 1)] ?? null;
  const priorPriorYear = state.years[yearIdFromStartYear(startYear - 2)] ?? null;

  if (monthIndex === 9) {
    // January: this year's POA1, plus the prior year's balancing payment (both due 31 Jan).
    const thisYearPoa = calculatePaymentsOnAccount(year, priorYear);
    let expected = thisYearPoa.poa1?.amount ?? 0;
    if (priorYear) {
      const priorYearPoa = calculatePaymentsOnAccount(priorYear, priorPriorYear);
      expected += Math.max(0, priorYearPoa.balancingPayment.amount);
    }
    return expected;
  }

  // July: the prior year's POA2.
  if (!priorYear) return 0;
  const priorYearPoa = calculatePaymentsOnAccount(priorYear, priorPriorYear);
  return priorYearPoa.poa2?.amount ?? 0;
}

export interface MonthlyProgress {
  monthIndex: number;
  cumulativeIncome: number;
  cumulativeTargetLiability: number;
  cumulativeSaved: number;
  variance: number;
}

/**
 * For each month, computes the cumulative self-assessment liability (income
 * tax + CGT) implied by everything entered so far this year - i.e. the
 * amount that should have been saved by that point to cover the year's tax
 * bill if nothing else changed for the rest of the year.
 */
export function calculateMonthlyProgress(year: TaxYearData): MonthlyProgress[] {
  const sorted = [...year.months].sort((a, b) => a.monthIndex - b.monthIndex);
  const results: MonthlyProgress[] = [];
  let cumulativeSaved = 0;
  for (const month of sorted) {
    const totals = sumMonths(year.months, year.rates, month.monthIndex);
    const { taxBreakdown, capitalGains } = computeReliefsAndCalc(year, totals);
    const cumulativeTargetLiability = Math.max(0, taxBreakdown.totalTax - totals.payeTaxDeducted) + capitalGains.tax;
    cumulativeSaved += month.savedThisMonth;
    results.push({
      monthIndex: month.monthIndex,
      cumulativeIncome: taxBreakdown.totalIncome + totals.capitalGains,
      cumulativeTargetLiability,
      cumulativeSaved,
      variance: cumulativeSaved - cumulativeTargetLiability,
    });
  }
  return results;
}

export interface TimelinePoint {
  yearId: string;
  monthIndex: number;
  /** e.g. "Jan 2026" */
  label: string;
  /** Total tax liability (income tax + CGT) accrued to date, across every year - never reduced by payments */
  cumulativeLiability: number;
  /** Total actually paid to HMRC to date (via the "paid to HMRC" field), across every year */
  cumulativePaidToHmrc: number;
  /** What's still owed and not yet paid - cumulativeLiability minus cumulativePaidToHmrc */
  outstandingLiability: number;
  /** Total money set aside to date, across every year */
  cumulativeSaved: number;
  /** Actual cash on hand for the tax bill - cumulativeSaved minus cumulativePaidToHmrc */
  bankBalance: number;
  /** This month's own HMRC payment, if any (for annotating the chart) */
  hmrcPaymentMade: number;
}

function calendarYearFor(startYear: number, monthIndex: number): number {
  return monthIndex <= 8 ? startYear : startYear + 1;
}

/**
 * Walks every tax year in chronological order, carrying the running tax
 * liability, amount saved, and amount paid to HMRC forward across year
 * boundaries instead of resetting each April - so the "amount that should be
 * in the bank" and the actual bank balance stay continuous across the whole
 * multi-year timeline, through every payment on account and balancing
 * payment date.
 */
export function calculateTimeline(state: PlannerState): TimelinePoint[] {
  const sortedYearIds = [...state.yearOrder].sort(
    (a, b) => startYearFromYearId(a) - startYearFromYearId(b),
  );

  const points: TimelinePoint[] = [];
  let liabilityBase = 0;
  let cumulativePaid = 0;
  let cumulativeSaved = 0;

  for (const yearId of sortedYearIds) {
    // A reconciled starting point resets the running totals at the start of
    // its year, so earlier history (real or not yet entered) is ignored from
    // this point on - only the difference between liabilityBase and
    // cumulativePaid matters for outstandingLiability, so resetting paid to
    // 0 and the base to the known figure is enough to pick up cleanly.
    if (state.openingBalance && state.openingBalance.yearId === yearId) {
      liabilityBase = state.openingBalance.outstandingLiability;
      cumulativePaid = 0;
      cumulativeSaved = state.openingBalance.savedBalance;
    }

    const year = state.years[yearId];
    const startYear = startYearFromYearId(yearId);
    const progress = calculateMonthlyProgress(year);
    const sortedMonths = [...year.months].sort((a, b) => a.monthIndex - b.monthIndex);

    for (const month of sortedMonths) {
      const monthProgress = progress.find((p) => p.monthIndex === month.monthIndex)!;
      cumulativePaid += month.hmrcPaymentMade;
      cumulativeSaved += month.savedThisMonth;
      const cumulativeLiability = liabilityBase + monthProgress.cumulativeTargetLiability;

      points.push({
        yearId,
        monthIndex: month.monthIndex,
        label: `${MONTH_LABELS[month.monthIndex]} ${calendarYearFor(startYear, month.monthIndex)}`,
        cumulativeLiability,
        cumulativePaidToHmrc: cumulativePaid,
        outstandingLiability: cumulativeLiability - cumulativePaid,
        cumulativeSaved,
        bankBalance: cumulativeSaved - cumulativePaid,
        hmrcPaymentMade: month.hmrcPaymentMade,
      });
    }

    // Once a year is fully behind us, its whole liability becomes a fixed
    // base the next year accrues on top of - tax owed doesn't disappear
    // just because a new tax year started.
    liabilityBase += calculateYearLiability(year).totalSelfAssessmentLiability;
  }

  return points;
}

export interface LedgerItem {
  label: string;
  amount: number;
  yearId: string;
}

export interface LedgerGroup {
  dueDate: string;
  items: LedgerItem[];
  totalExpected: number;
  /** null when the month that due date falls in isn't on record, so we can't know what was actually paid */
  actualPaid: number | null;
  variance: number | null;
  status: 'paid' | 'partial' | 'upcoming' | 'overdue' | 'none';
}

/** 31 Jan falls in the January of the tax year that started the previous calendar year; 31 Jul falls in the July of the tax year starting that same calendar year. */
function taxYearAndMonthForDueDate(dueDate: string): { yearId: string; monthIndex: number } {
  const [yearStr, monthStr] = dueDate.split('-');
  const calendarYear = Number(yearStr);
  const month = Number(monthStr);
  return month === 1
    ? { yearId: yearIdFromStartYear(calendarYear - 1), monthIndex: 9 }
    : { yearId: yearIdFromStartYear(calendarYear), monthIndex: 3 };
}

/**
 * A single chronological ledger of every payment on account and balancing
 * payment across all years on record, grouped by due date (a year's POA1
 * and the prior year's balancing payment always share the same 31 Jan
 * date), each cross-referenced against what was actually recorded as paid
 * that month via the "paid to HMRC" field.
 */
export function calculatePaymentLedger(state: PlannerState): LedgerGroup[] {
  const sortedYearIds = [...state.yearOrder].sort(
    (a, b) => startYearFromYearId(a) - startYearFromYearId(b),
  );

  const groupsByDate = new Map<string, LedgerItem[]>();
  for (const yearId of sortedYearIds) {
    const year = state.years[yearId];
    const startYear = startYearFromYearId(yearId);
    const priorYear = state.years[yearIdFromStartYear(startYear - 1)] ?? null;
    const schedule = calculatePaymentsOnAccount(year, priorYear);

    const add = (item: PaymentEvent) => {
      const existing = groupsByDate.get(item.dueDate) ?? [];
      existing.push({ label: `${item.label} (${year.rates.label})`, amount: item.amount, yearId });
      groupsByDate.set(item.dueDate, existing);
    };
    if (schedule.poa1) add(schedule.poa1);
    if (schedule.poa2) add(schedule.poa2);
    add(schedule.balancingPayment);
  }

  const today = new Date().toISOString().slice(0, 10);

  const groups: LedgerGroup[] = [...groupsByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dueDate, items]) => {
      const totalExpected = items.reduce((sum, i) => sum + i.amount, 0);
      const { yearId, monthIndex } = taxYearAndMonthForDueDate(dueDate);
      const month = state.years[yearId]?.months.find((m) => m.monthIndex === monthIndex);
      const actualPaid = month ? month.hmrcPaymentMade : null;
      const variance = actualPaid === null ? null : actualPaid - totalExpected;

      let status: LedgerGroup['status'] = 'none';
      if (totalExpected > 0 || actualPaid) {
        if (actualPaid) status = variance !== null && variance < -0.5 ? 'partial' : 'paid';
        else status = dueDate < today ? 'overdue' : 'upcoming';
      }

      return { dueDate, items, totalExpected, actualPaid, variance, status };
    })
    .filter((g) => g.status !== 'none');

  return groups;
}
