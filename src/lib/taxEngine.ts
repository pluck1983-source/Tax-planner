import type { MonthlyEntry, TaxYearData, TaxYearRates } from './types';

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
  /** How much of the extended basic-rate band is left after non-dividend and dividend income - available to CGT at the lower rate */
  remainingBasicRateBandWidth: number;
  nonDividendTax: number;
  dividendTax: number;
  totalTax: number;
}

/**
 * Computes total UK income tax for a tax year given non-dividend income
 * (salary + other taxable income, stacked first) and dividend income
 * (stacked last, after the personal allowance and other bands are used up).
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
  dividendIncome: number,
  reliefs: IncomeReliefs = { pensionContribution: 0, giftAid: 0 },
): IncomeTaxBreakdown {
  const totalIncome = Math.max(0, nonDividendIncome) + Math.max(0, dividendIncome);
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

  // Dividends stack on top of non-dividend income, using whatever band capacity remains.
  const remainingBands = bandsFor(rates.dividendRates).map((band, i) => ({
    ...band,
    width: Math.max(0, band.width - nonDividendResult.perBand[i]),
  }));

  const dividends = Math.max(0, dividendIncome);
  const { perBand: divPerBand } = taxThroughBands(dividends, remainingBands);

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
    extendedBasicRateBandWidth - nonDividendResult.perBand[0] - divPerBand[0],
  );

  return {
    totalIncome,
    adjustedNetIncome,
    personalAllowance: pa,
    extendedBasicRateBandWidth,
    remainingBasicRateBandWidth,
    nonDividendTax: nonDividendResult.tax,
    dividendTax,
    totalTax: nonDividendResult.tax + dividendTax,
  };
}

/** Estimates PAYE tax that would be withheld on salary alone under a standard tax code. */
export function estimatePayeTax(rates: TaxYearRates, salary: number): number {
  return calculateIncomeTax(rates, salary, 0).nonDividendTax;
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
  dividends: number;
  otherIncome: number;
  pensionContribution: number;
  giftAid: number;
  capitalGains: number;
  savedThisMonth: number;
}

export function sumMonths(months: MonthlyEntry[], rates: TaxYearRates, uptoIndex?: number): MonthlyTotals {
  const slice = uptoIndex === undefined ? months : months.filter((m) => m.monthIndex <= uptoIndex);
  return slice.reduce<MonthlyTotals>(
    (acc, m) => ({
      paye: acc.paye + m.paye,
      payeTaxDeducted:
        acc.payeTaxDeducted + (m.payeTaxDeducted ?? estimatePayeTax(rates, m.paye)),
      dividends: acc.dividends + m.dividends,
      otherIncome: acc.otherIncome + m.otherIncome,
      pensionContribution: acc.pensionContribution + m.pensionContribution,
      giftAid: acc.giftAid + m.giftAid,
      capitalGains: acc.capitalGains + m.capitalGains,
      savedThisMonth: acc.savedThisMonth + m.savedThisMonth,
    }),
    {
      paye: 0,
      payeTaxDeducted: 0,
      dividends: 0,
      otherIncome: 0,
      pensionContribution: 0,
      giftAid: 0,
      capitalGains: 0,
      savedThisMonth: 0,
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
  const taxBreakdown = calculateIncomeTax(year.rates, nonDividendIncome, totals.dividends, reliefs);
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
  let poaAmountEach = 0;
  if (priorYear) {
    const prior = calculateYearLiability(priorYear);
    const collectedFraction =
      prior.taxBreakdown.totalTax > 0 ? prior.totals.payeTaxDeducted / prior.taxBreakdown.totalTax : 1;
    poaRequired =
      prior.incomeTaxSelfAssessmentLiability > currentYear.rates.poaThreshold &&
      collectedFraction < currentYear.rates.poaSourceCollectionFraction;
    if (poaRequired) poaAmountEach = prior.incomeTaxSelfAssessmentLiability / 2;
  }

  const poa1: PaymentEvent | null = poaRequired
    ? { label: 'Payment on account 1', dueDate: jan31, amount: poaAmountEach, yearId: currentYear.id }
    : null;
  const poa2: PaymentEvent | null = poaRequired
    ? { label: 'Payment on account 2', dueDate: jul31, amount: poaAmountEach, yearId: currentYear.id }
    : null;

  const poaPaid = poaRequired ? poaAmountEach * 2 : 0;
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
