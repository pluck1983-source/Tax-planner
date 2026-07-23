/** The two nationally-defined funded childcare entitlements a child can be registered for. */
export type FundingType = 'universal15' | 'extended30';

/** Every funding type plus "none" - a private/fully fee-paying child. */
export type ChildFundingType = FundingType | 'none';

/**
 * An age group that funded hours are calculated against, e.g. "9 months to
 * 2 years". Shared across all local authorities so rates only differ by
 * hourly amount, not by how ages are grouped - editable in case a band's
 * boundaries change.
 */
export interface AgeBand {
  id: string;
  label: string;
  /** Age in whole months at which a child qualifies for this band's funding */
  minAgeMonths: number;
}

/**
 * A funded hourly rate for one age band + funding type, effective from a
 * given date. Local authorities increase rates periodically (typically
 * each September/January/April), so multiple rates can exist per band/type
 * - the one with the latest effectiveFrom on or before a given date applies.
 */
export interface FundingRate {
  id: string;
  ageBandId: string;
  fundingType: FundingType;
  /** Pounds paid per hour by the local authority */
  hourlyRate: number;
  effectiveFrom: string;
}

/**
 * How a local authority actually pays funded-hours income to the
 * childminder: in 3 lump sums per year (once per term, in arrears
 * following that term's headcount/census return), or spread evenly across
 * monthly instalments. Some LAs offer a choice - this records whichever
 * the childminder has agreed with them.
 */
export type FundingPaymentSchedule = 'termly' | 'monthly';

export interface LocalAuthority {
  id: string;
  name: string;
  contactNotes: string;
  fundingRates: FundingRate[];
  fundingPaymentSchedule: FundingPaymentSchedule;
  /** For termly payment: weeks after a term's start date the lump sum typically arrives, once headcount is processed */
  termlyPaymentLagWeeks: number;
}

/**
 * The childminder's own hourly rate for non-funded hours, optionally
 * targeted at one age band (e.g. a higher baby rate) - null applies to any
 * age band without its own specific rate. Supports rate history the same
 * way funding rates do.
 */
export interface NonFundedRate {
  id: string;
  ageBandId: string | null;
  hourlyRate: number;
  effectiveFrom: string;
}

export type LatePickupChargeType = 'flat' | 'perHour' | 'per15Min';

export interface LatePickupRate {
  id: string;
  chargeType: LatePickupChargeType;
  amount: number;
  /** Minutes after the scheduled end time before a late charge applies */
  graceMinutes: number;
  effectiveFrom: string;
}

export interface ChildminderRates {
  nonFundedRates: NonFundedRate[];
  latePickupRates: LatePickupRate[];
}

/** 0 = Sunday .. 6 = Saturday, matching JS Date#getDay() */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleDay {
  dayOfWeek: DayOfWeek;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
}

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export interface EmergencyContact extends Contact {
  relationship: string;
}

/**
 * Whether a child attends only during term time (no care needed in school
 * holidays - e.g. they also attend a school-age setting) or full time,
 * year-round including school holidays.
 */
export type AttendancePattern = 'termTimeOnly' | 'fullTime';

/**
 * A dated change to a child's attendance pattern - parents switch between
 * term-time-only and full-time fairly often (e.g. once a child starts
 * school), so this is a history rather than a single flag: the entry with
 * the latest effectiveFrom on or before a given date applies.
 */
export interface AttendancePatternChange {
  id: string;
  pattern: AttendancePattern;
  effectiveFrom: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryParent: Contact;
  /** Second parent/carer, if there's one to keep on file */
  secondaryParent: Contact | null;
  emergencyContact: EmergencyContact | null;
  localAuthorityId: string | null;
  fundingType: ChildFundingType;
  startDate: string;
  endDate: string | null;
  active: boolean;
  weeklySchedule: ScheduleDay[];
  attendancePatternHistory: AttendancePatternChange[];
  notes: string;
}

export type HolidayOwner = { type: 'childminder' } | { type: 'client'; childId: string };

export interface Holiday {
  id: string;
  owner: HolidayOwner;
  startDate: string;
  endDate: string;
  label: string;
  /**
   * The date notice of this holiday was actually given, as evidence in case
   * of a later dispute over how much notice was provided - distinct from
   * the holiday's own start date, and can be recorded however far ahead of
   * or behind it the real notice was.
   */
  noticeGivenDate: string | null;
}

export interface Term {
  id: string;
  label: string;
  academicYear: string;
  startDate: string;
  endDate: string;
}

export type AttendanceStatus = 'present' | 'late-arrival' | 'no-show' | 'absence-notified' | 'left-early';

export interface AttendanceRecord {
  id: string;
  childId: string;
  date: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  status: AttendanceStatus;
  /** Manually set, or auto-suggested for late-arrival/no-show so nothing gets missed for safeguarding purposes */
  safeguardingFlag: boolean;
  notes: string;
}

/** A funding payment actually received from a local authority - the confirmed counterpart to the forecast's projected funding payments. */
export interface FundingPaymentRecord {
  id: string;
  localAuthorityId: string;
  termId: string | null;
  amount: number;
  /** Date the payment actually arrived */
  date: string;
  notes: string;
}

/** A payment actually received from a parent - the confirmed counterpart to the forecast's projected parental income. */
export interface ParentPaymentRecord {
  id: string;
  childId: string;
  amount: number;
  /** Date the payment actually arrived */
  date: string;
  method: string;
  notes: string;
}

/**
 * Self-employment tax settings for one UK tax year (6 April - 5 April),
 * covering Income Tax and Class 4 National Insurance on childminding
 * trading profit. Editable per year since rates/thresholds change.
 */
export interface TaxYearSettings {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  personalAllowance: number;
  /** Width of the basic-rate band above the personal allowance */
  basicRateBandWidth: number;
  /** Total income above which the additional rate applies */
  additionalRateThreshold: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
  /** Tax-free trading allowance - used instead of actual expenses when expenses are lower */
  tradingAllowance: number;
  class4LowerLimit: number;
  class4UpperLimit: number;
  class4LowerRate: number;
  class4UpperRate: number;
  /** Allowable expenses recorded so far this tax year */
  expensesToDate: number;
  /** Estimated allowable expenses for the whole tax year, for the forecast liability */
  projectedFullYearExpenses: number;
}

export interface ChildminderState {
  ageBands: AgeBand[];
  localAuthorities: LocalAuthority[];
  rates: ChildminderRates;
  children: Child[];
  holidays: Holiday[];
  terms: Term[];
  attendance: AttendanceRecord[];
  fundingPaymentsReceived: FundingPaymentRecord[];
  parentPaymentsReceived: ParentPaymentRecord[];
  taxYears: TaxYearSettings[];
  selectedTaxYearId: string | null;
}
