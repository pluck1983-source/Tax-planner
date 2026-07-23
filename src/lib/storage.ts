import { initialChildminderState } from './defaultData';
import type { ChildminderState } from './types';

const STORAGE_KEY = 'childminder-tracker-state-v1';

const EMPTY_CONTACT = { name: '', phone: '', email: '' };

function normalizeState(state: ChildminderState): ChildminderState {
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
    })),
    holidays: state.holidays ?? [],
    terms: state.terms ?? [],
    attendance: state.attendance ?? [],
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
