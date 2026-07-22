export interface TaxYearRates {
  /** e.g. "2025-26" */
  id: string;
  /** e.g. "2025/26" */
  label: string;
  /** ISO date, 6 April */
  startDate: string;
  /** ISO date, 5 April following year */
  endDate: string;

  personalAllowance: number;
  /** Adjusted net income above which personal allowance starts to taper */
  paTaperThreshold: number;
  /** Allowance lost per £1 over the taper threshold (e.g. 0.5 = £1 per £2) */
  paTaperRate: number;

  /** Width of the basic-rate band applied immediately after the personal allowance */
  basicRateBandWidth: number;
  /** Total income above which the additional rate applies (also where PA reaches £0) */
  additionalRateThreshold: number;

  nonDividendRates: {
    basic: number;
    higher: number;
    additional: number;
  };

  dividendAllowance: number;
  dividendRates: {
    basic: number;
    higher: number;
    additional: number;
  };

  /** Payments on account only apply if prior year self-assessment liability exceeds this */
  poaThreshold: number;
  /** Payments on account are skipped if at least this fraction of tax was collected at source */
  poaSourceCollectionFraction: number;

  /**
   * Rate used to gross up net personal pension contributions (relief at
   * source) and Gift Aid donations back to their gross value - e.g. a net
   * £80 donation grosses up to £100 at a 0.2 (20%) rate.
   */
  pensionGiftAidGrossUpRate: number;

  /** Annual exempt amount for Capital Gains Tax */
  cgtAnnualExemptAmount: number;
  cgtRates: {
    basic: number;
    higher: number;
  };

  /** Starting rate for savings: width of the 0% band, reduced £1 for £1 by non-savings income using it up */
  savingsStartingRateBandWidth: number;
  /** Personal Savings Allowance, which depends on which band the taxpayer's total income falls into */
  savingsAllowance: {
    basic: number;
    higher: number;
    additional: number;
  };
}

export const MONTH_LABELS = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
] as const;

export interface MonthlyEntry {
  /** 0 = April .. 11 = March, matching MONTH_LABELS */
  monthIndex: number;
  paye: number;
  payeTaxDeducted: number | null;
  /** Dividends from your own company, as director/shareholder-employee */
  dividendsEmployment: number;
  /** Dividends from other shareholdings, e.g. a personal share-dealing/trading account */
  dividendsShareDealing: number;
  otherIncome: number;
  /** Untaxed UK bank/building society interest - most interest is now paid gross, without tax deducted at source */
  savingsInterest: number;
  /** Net amount paid into a personal (relief-at-source) pension this month, e.g. a SIPP */
  pensionContribution: number;
  /** Net Gift Aid donations made this month */
  giftAid: number;
  /** Net chargeable capital gains realised this month (before the annual exempt amount) */
  capitalGains: number;
  savedThisMonth: number;
  /**
   * Actual amount paid to HMRC this month (positive = paid out, negative = a
   * refund received). Only expected in January (payment on account 1 +
   * prior year's balancing payment) and July (prior year's payment on
   * account 2), but any month can be used.
   */
  hmrcPaymentMade: number;
  notes: string;
}

export interface TaxYearData {
  id: string;
  rates: TaxYearRates;
  months: MonthlyEntry[];
  /**
   * When true, this year is entered as yearly totals rather than
   * month-by-month - useful for an earlier year you just want to seed for
   * payments-on-account purposes without logging every month. The totals
   * are still stored via the same `months` array (bulk figures in April,
   * HMRC payments in January/July) so every calculation works unchanged.
   */
  isIndicative: boolean;
  /**
   * Known actual payment-on-account amounts HMRC has set for this year,
   * overriding the normal calculation from the prior year's liability - for
   * when the prior year isn't on record (or isn't accurate) but the actual
   * POA figures from HMRC's own statement are known.
   */
  poaOverride: PoaOverride | null;
  /**
   * A what-if forecast of this year's full-year totals, entirely separate
   * from the real monthly entries - for working out roughly what to save
   * each month and what the resulting payments on account would look like,
   * before the year's actual figures are known.
   */
  prediction: YearPrediction | null;
}

export interface YearPrediction {
  paye: number;
  payeTaxDeducted: number | null;
  dividendsEmployment: number;
  dividendsShareDealing: number;
  otherIncome: number;
  savingsInterest: number;
  pensionContribution: number;
  giftAid: number;
  capitalGains: number;
}

export interface PoaOverride {
  /** Known payment on account 1 amount, due 31 January within the tax year */
  poa1: number;
  /** Known payment on account 2 amount, due 31 July just after the tax year ends */
  poa2: number;
  /**
   * A known balancing payment for an earlier, untracked tax year that's also
   * due the same 31 January as this year's payment on account 1 - HMRC
   * always combines them into one amount on your statement. Shown as an
   * extra line on the same due date, but not counted towards this year's
   * own payments on account, since it isn't this year's money.
   */
  priorYearBalancingPayment: number;
}

export interface OpeningBalance {
  /** The tax year this reconciled starting point applies from (i.e. as of the start of this year) */
  yearId: string;
  /** Known actual bank balance set aside for tax as of the start of that year */
  savedBalance: number;
  /** Known actual amount still owed to HMRC as of the start of that year */
  outstandingLiability: number;
}

export interface PlannerState {
  years: Record<string, TaxYearData>;
  yearOrder: string[];
  selectedYearId: string | null;
  /**
   * An optional reconciled starting point for the Timeline's running totals,
   * so you don't have to reconstruct exact historical figures for every
   * earlier year - just set what you know is true now and carry on from
   * there. Only affects the Timeline's cumulative figures, not per-year tax
   * or payments-on-account calculations.
   */
  openingBalance: OpeningBalance | null;
  /**
   * Toggled from the Payments tab. When true, the Payments ledger and
   * Timeline both show a projected estimate for the tax year following the
   * latest one on record, based on the last fully-entered year's liability
   * (not the latest year, which may still be in progress and understate a
   * full year).
   */
  showFollowingYearEstimate: boolean;
}
