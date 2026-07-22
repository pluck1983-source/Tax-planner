import { useCallback, useEffect, useState } from 'react';
import type { MonthlyEntry, OpeningBalance, PlannerState, TaxYearRates } from './types';
import {
  addNewYear,
  addPreviousYear,
  clearYearData,
  deleteYear as deleteYearFromState,
  loadState,
  saveState,
  setIndicative,
  setOpeningBalance,
} from './storage';

export function usePlannerState() {
  const [state, setState] = useState<PlannerState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const selectYear = useCallback((yearId: string) => {
    setState((s) => ({ ...s, selectedYearId: yearId }));
  }, []);

  const addYear = useCallback(() => {
    setState((s) => addNewYear(s));
  }, []);

  const addPriorYear = useCallback(() => {
    setState((s) => addPreviousYear(s));
  }, []);

  const updateMonth = useCallback((yearId: string, monthIndex: number, patch: Partial<MonthlyEntry>) => {
    setState((s) => {
      const year = s.years[yearId];
      if (!year) return s;
      const months = year.months.map((m) => (m.monthIndex === monthIndex ? { ...m, ...patch } : m));
      return { ...s, years: { ...s.years, [yearId]: { ...year, months } } };
    });
  }, []);

  const updateRates = useCallback((yearId: string, patch: Partial<TaxYearRates>) => {
    setState((s) => {
      const year = s.years[yearId];
      if (!year) return s;
      return { ...s, years: { ...s.years, [yearId]: { ...year, rates: { ...year.rates, ...patch } } } };
    });
  }, []);

  const toggleIndicative = useCallback((yearId: string, indicative: boolean) => {
    setState((s) => setIndicative(s, yearId, indicative));
  }, []);

  const clearYear = useCallback((yearId: string) => {
    setState((s) => clearYearData(s, yearId));
  }, []);

  const deleteYear = useCallback((yearId: string) => {
    setState((s) => deleteYearFromState(s, yearId));
  }, []);

  const setOpening = useCallback((balance: OpeningBalance | null) => {
    setState((s) => setOpeningBalance(s, balance));
  }, []);

  const replaceState = useCallback((next: PlannerState) => {
    setState(next);
  }, []);

  return {
    state,
    selectYear,
    addYear,
    addPriorYear,
    updateMonth,
    updateRates,
    toggleIndicative,
    clearYear,
    deleteYear,
    setOpening,
    replaceState,
  };
}
