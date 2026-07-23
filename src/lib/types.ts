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
  notes: string;
}

export type HolidayOwner = { type: 'childminder' } | { type: 'client'; childId: string };

export interface Holiday {
  id: string;
  owner: HolidayOwner;
  startDate: string;
  endDate: string;
  label: string;
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

export interface ChildminderState {
  ageBands: AgeBand[];
  localAuthorities: LocalAuthority[];
  rates: ChildminderRates;
  children: Child[];
  holidays: Holiday[];
  terms: Term[];
  attendance: AttendanceRecord[];
}
