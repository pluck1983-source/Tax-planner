import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { loadState, saveState } from './storage';
import type {
  AgeBand,
  AttendanceRecord,
  Child,
  ChildminderState,
  FundingRate,
  Holiday,
  LatePickupRate,
  LocalAuthority,
  NonFundedRate,
  Term,
} from './types';

export function useChildminderState() {
  const [state, setState] = useState<ChildminderState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Age bands
  const addAgeBand = useCallback((band: Omit<AgeBand, 'id'>) => {
    setState((s) => ({ ...s, ageBands: [...s.ageBands, { ...band, id: uuid() }] }));
  }, []);
  const updateAgeBand = useCallback((id: string, patch: Partial<AgeBand>) => {
    setState((s) => ({ ...s, ageBands: s.ageBands.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  }, []);
  const deleteAgeBand = useCallback((id: string) => {
    setState((s) => ({ ...s, ageBands: s.ageBands.filter((b) => b.id !== id) }));
  }, []);

  // Local authorities
  const addLocalAuthority = useCallback((la: { name: string }) => {
    setState((s) => ({
      ...s,
      localAuthorities: [
        ...s.localAuthorities,
        { ...la, id: uuid(), contactNotes: '', fundingRates: [], fundingPaymentSchedule: 'termly', termlyPaymentLagWeeks: 5 },
      ],
    }));
  }, []);
  const updateLocalAuthority = useCallback((id: string, patch: Partial<Omit<LocalAuthority, 'fundingRates'>>) => {
    setState((s) => ({
      ...s,
      localAuthorities: s.localAuthorities.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);
  const deleteLocalAuthority = useCallback((id: string) => {
    setState((s) => ({ ...s, localAuthorities: s.localAuthorities.filter((l) => l.id !== id) }));
  }, []);

  const addFundingRate = useCallback((localAuthorityId: string, rate: Omit<FundingRate, 'id'>) => {
    setState((s) => ({
      ...s,
      localAuthorities: s.localAuthorities.map((l) =>
        l.id === localAuthorityId ? { ...l, fundingRates: [...l.fundingRates, { ...rate, id: uuid() }] } : l,
      ),
    }));
  }, []);
  const updateFundingRate = useCallback((localAuthorityId: string, id: string, patch: Partial<FundingRate>) => {
    setState((s) => ({
      ...s,
      localAuthorities: s.localAuthorities.map((l) =>
        l.id === localAuthorityId
          ? { ...l, fundingRates: l.fundingRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
          : l,
      ),
    }));
  }, []);
  const deleteFundingRate = useCallback((localAuthorityId: string, id: string) => {
    setState((s) => ({
      ...s,
      localAuthorities: s.localAuthorities.map((l) =>
        l.id === localAuthorityId ? { ...l, fundingRates: l.fundingRates.filter((r) => r.id !== id) } : l,
      ),
    }));
  }, []);

  // Non-funded + late pickup rates
  const addNonFundedRate = useCallback((rate: Omit<NonFundedRate, 'id'>) => {
    setState((s) => ({ ...s, rates: { ...s.rates, nonFundedRates: [...s.rates.nonFundedRates, { ...rate, id: uuid() }] } }));
  }, []);
  const updateNonFundedRate = useCallback((id: string, patch: Partial<NonFundedRate>) => {
    setState((s) => ({
      ...s,
      rates: { ...s.rates, nonFundedRates: s.rates.nonFundedRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
    }));
  }, []);
  const deleteNonFundedRate = useCallback((id: string) => {
    setState((s) => ({ ...s, rates: { ...s.rates, nonFundedRates: s.rates.nonFundedRates.filter((r) => r.id !== id) } }));
  }, []);

  const addLatePickupRate = useCallback((rate: Omit<LatePickupRate, 'id'>) => {
    setState((s) => ({ ...s, rates: { ...s.rates, latePickupRates: [...s.rates.latePickupRates, { ...rate, id: uuid() }] } }));
  }, []);
  const updateLatePickupRate = useCallback((id: string, patch: Partial<LatePickupRate>) => {
    setState((s) => ({
      ...s,
      rates: { ...s.rates, latePickupRates: s.rates.latePickupRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
    }));
  }, []);
  const deleteLatePickupRate = useCallback((id: string) => {
    setState((s) => ({ ...s, rates: { ...s.rates, latePickupRates: s.rates.latePickupRates.filter((r) => r.id !== id) } }));
  }, []);

  // Children
  const addChild = useCallback((child: Omit<Child, 'id'>) => {
    setState((s) => ({ ...s, children: [...s.children, { ...child, id: uuid() }] }));
    return undefined;
  }, []);
  const updateChild = useCallback((id: string, patch: Partial<Child>) => {
    setState((s) => ({ ...s, children: s.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);
  const deleteChild = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      children: s.children.filter((c) => c.id !== id),
      holidays: s.holidays.filter((h) => !(h.owner.type === 'client' && h.owner.childId === id)),
      attendance: s.attendance.filter((a) => a.childId !== id),
    }));
  }, []);

  // Holidays
  const addHoliday = useCallback((holiday: Omit<Holiday, 'id'>) => {
    setState((s) => ({ ...s, holidays: [...s.holidays, { ...holiday, id: uuid() }] }));
  }, []);
  const updateHoliday = useCallback((id: string, patch: Partial<Holiday>) => {
    setState((s) => ({ ...s, holidays: s.holidays.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  }, []);
  const deleteHoliday = useCallback((id: string) => {
    setState((s) => ({ ...s, holidays: s.holidays.filter((h) => h.id !== id) }));
  }, []);

  // Terms
  const addTerm = useCallback((term: Omit<Term, 'id'>) => {
    setState((s) => ({ ...s, terms: [...s.terms, { ...term, id: uuid() }] }));
  }, []);
  const updateTerm = useCallback((id: string, patch: Partial<Term>) => {
    setState((s) => ({ ...s, terms: s.terms.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);
  const deleteTerm = useCallback((id: string) => {
    setState((s) => ({ ...s, terms: s.terms.filter((t) => t.id !== id) }));
  }, []);

  // Attendance
  const addAttendance = useCallback((record: Omit<AttendanceRecord, 'id'>) => {
    setState((s) => ({ ...s, attendance: [...s.attendance, { ...record, id: uuid() }] }));
  }, []);
  const updateAttendance = useCallback((id: string, patch: Partial<AttendanceRecord>) => {
    setState((s) => ({ ...s, attendance: s.attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);
  const deleteAttendance = useCallback((id: string) => {
    setState((s) => ({ ...s, attendance: s.attendance.filter((a) => a.id !== id) }));
  }, []);

  const replaceState = useCallback((next: ChildminderState) => setState(next), []);

  return {
    state,
    addAgeBand,
    updateAgeBand,
    deleteAgeBand,
    addLocalAuthority,
    updateLocalAuthority,
    deleteLocalAuthority,
    addFundingRate,
    updateFundingRate,
    deleteFundingRate,
    addNonFundedRate,
    updateNonFundedRate,
    deleteNonFundedRate,
    addLatePickupRate,
    updateLatePickupRate,
    deleteLatePickupRate,
    addChild,
    updateChild,
    deleteChild,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addTerm,
    updateTerm,
    deleteTerm,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    replaceState,
  };
}
