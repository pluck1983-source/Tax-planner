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
  dividends: number;
  otherIncome: number;
  savedThisMonth: number;
  notes: string;
}

export interface TaxYearData {
  id: string;
  rates: TaxYearRates;
  months: MonthlyEntry[];
}

export interface PlannerState {
  years: Record<string, TaxYearData>;
  yearOrder: string[];
  selectedYearId: string | null;
}
