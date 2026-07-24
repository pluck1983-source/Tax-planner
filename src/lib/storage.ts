import { initialChildminderState } from './defaultData';
import { defaultTaxYearSettings, taxYearStartForDate } from './taxEngine';
import type { ChildminderState } from './types';

const STORAGE_KEY = 'childminder-tracker-state-v1';

const EMPTY_CONTACT = { name: '', phone: '', email: '' };

function normalizeState(state: ChildminderState): ChildminderState {
  const taxYears = state.taxYears?.length ? state.taxYears : [defaultTaxYearSettings(taxYearStartForDate(new Date()))];
  return {
    ageBands: state.ageBands ?? initialChildminderState().ageBands,
    localAuthorities: (state.localAuthorities ?? []).map((l) => ({
      ...l,
      fundingPaymentSchedule: l.fundingPaymentSchedule ?? 'termly',
      termlyPaymentLagWeeks: l.termlyPaymentLagWeeks ?? 5,
    })),
    rates: {
      nonFundedRates: state.rates?.nonFundedRates ?? [],
      latePickupRates: state.rates?.latePickupRates ?? [],
    },
    children: (state.children ?? []).map((c) => ({
      ...c,
      weeklySchedule: c.weeklySchedule ?? [],
      primaryParent: c.primaryParent ?? { ...EMPTY_CONTACT },
      secondaryParent: c.secondaryParent ?? null,
      emergencyContact: c.emergencyContact ?? null,
      attendancePatternHistory: c.attendancePatternHistory ?? [{ id: `${c.id}-default-pattern`, pattern: 'fullTime', effectiveFrom: c.startDate }],
    })),
    holidays: (state.holidays ?? []).map((h) => ({ ...h, noticeGivenDate: h.noticeGivenDate ?? null })),
    terms: state.terms ?? [],
    attendance: state.attendance ?? [],
    fundingPaymentsReceived: state.fundingPaymentsReceived ?? [],
    parentPaymentsReceived: state.parentPaymentsReceived ?? [],
    taxYears,
    selectedTaxYearId: state.selectedTaxYearId && taxYears.some((y) => y.id === state.selectedTaxYearId) ? state.selectedTaxYearId : taxYears[0].id,
  };
}

export function loadState(): ChildminderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialChildminderState();
    const parsed = JSON.parse(raw) as ChildminderState;
    if (!parsed.ageBands || !parsed.children) return initialChildminderState();
    return normalizeState(parsed);
  } catch {
    return initialChildminderState();
  }
}

export function saveState(state: ChildminderState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateAsJson(state: ChildminderState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(json: string): ChildminderState {
  const parsed = JSON.parse(json) as ChildminderState;
  if (!parsed.ageBands || !parsed.children) throw new Error('Invalid childminder tracker file');
  return normalizeState(parsed);
}
