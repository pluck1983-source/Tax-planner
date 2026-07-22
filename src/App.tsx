import { useRef, useState } from 'react';
import { usePlannerState } from './lib/usePlannerState';
import { startYearFromYearId, yearIdFromStartYear } from './lib/defaultRates';
import { exportStateAsJson, importStateFromJson } from './lib/storage';
import type { TaxYearData } from './lib/types';
import { YearSidebar } from './components/YearSidebar';
import { MonthlyTable } from './components/MonthlyTable';
import { IndicativeYearForm } from './components/IndicativeYearForm';
import { YearSummary } from './components/YearSummary';
import { SavingsChart } from './components/SavingsChart';
import { RatesEditor } from './components/RatesEditor';
import { TimelineView } from './components/TimelineView';
import { PaymentsLedger } from './components/PaymentsLedger';
import { PredictionView } from './components/PredictionView';

type Tab = 'monthly' | 'summary' | 'prediction' | 'timeline' | 'payments' | 'rates';

function hasMultiMonthDetail(year: TaxYearData): boolean {
  const monthsWithData = year.months.filter(
    (m) =>
      m.paye ||
      m.dividendsEmployment ||
      m.dividendsShareDealing ||
      m.otherIncome ||
      m.pensionContribution ||
      m.giftAid ||
      m.capitalGains ||
      m.savedThisMonth,
  );
  return monthsWithData.length > 1;
}

function App() {
  const {
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
    setPoaOverrideForYear,
    setFollowingYearEstimate,
    setPrediction,
    replaceState,
  } = usePlannerState();
  const [tab, setTab] = useState<Tab>('monthly');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedYear = state.selectedYearId ? state.years[state.selectedYearId] : null;
  const priorYearId = selectedYear ? yearIdFromStartYear(startYearFromYearId(selectedYear.id) - 1) : null;
  const priorYear = priorYearId ? (state.years[priorYearId] ?? null) : null;

  function handleToggleIndicative() {
    if (!selectedYear) return;
    const goingIndicative = !selectedYear.isIndicative;
    if (goingIndicative && hasMultiMonthDetail(selectedYear)) {
      const ok = window.confirm(
        `Switch ${selectedYear.rates.label} to indicative (yearly totals) entry? Your monthly figures will be combined into yearly totals - the month-by-month breakdown will be lost, though the totals themselves are kept.`,
      );
      if (!ok) return;
    }
    toggleIndicative(selectedYear.id, goingIndicative);
  }

  function handleClearYear() {
    if (!selectedYear) return;
    const ok = window.confirm(
      `Clear all data for ${selectedYear.rates.label}? Every month will be reset to zero. This can't be undone.`,
    );
    if (ok) clearYear(selectedYear.id);
  }

  function handleDeleteYear() {
    if (!selectedYear) return;
    const ok = window.confirm(
      `Delete ${selectedYear.rates.label} entirely? This removes all its data and can't be undone.`,
    );
    if (ok) deleteYear(selectedYear.id);
  }

  function handleExport() {
    const blob = new Blob([exportStateAsJson(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tax-planner-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        replaceState(importStateFromJson(text));
      } catch {
        alert('Could not read that file - is it a Tax Planner export?');
      }
    });
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Director Tax Planner</h1>
            <p className="text-xs text-slate-400">
              Monthly PAYE, dividends &amp; other income - your self-assessment savings target
            </p>
          </div>
          <div className="flex gap-2 no-print">
            <button
              type="button"
              onClick={handleExport}
              className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:border-slate-400 dark:border-slate-700"
            >
              Export
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:border-slate-400 dark:border-slate-700"
            >
              Import
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        <YearSidebar state={state} onSelect={selectYear} onAddYear={addYear} onAddPriorYear={addPriorYear} />

        <div className="flex-1 min-w-0">
          {!selectedYear && <p className="text-slate-400">Select or add a tax year to get started.</p>}
          {selectedYear && (
            <>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{selectedYear.rates.label} tax year</h2>
                  {selectedYear.isIndicative && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      Indicative
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(selectedYear.rates.startDate).toLocaleDateString('en-GB')} -{' '}
                  {new Date(selectedYear.rates.endDate).toLocaleDateString('en-GB')}
                </p>
              </div>

              <div className="flex items-center gap-2 mb-4 no-print">
                <button
                  type="button"
                  onClick={handleToggleIndicative}
                  className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400"
                >
                  {selectedYear.isIndicative ? 'Switch to monthly entry' : 'Switch to indicative (yearly totals)'}
                </button>
                <button
                  type="button"
                  onClick={handleClearYear}
                  className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400"
                >
                  Clear data
                </button>
                <button
                  type="button"
                  onClick={handleDeleteYear}
                  className="text-xs px-2.5 py-1 rounded border border-rose-200 text-rose-600 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
                >
                  Delete year
                </button>
              </div>

              <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-800 no-print">
                {(
                  [
                    ['monthly', selectedYear.isIndicative ? 'Yearly totals' : 'Monthly entries'],
                    ['summary', 'Summary & payments'],
                    ['prediction', 'Forecast'],
                    ['timeline', 'Timeline'],
                    ['payments', 'Payments'],
                    ['rates', 'Rates'],
                  ] as [Tab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                      tab === id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'monthly' &&
                (selectedYear.isIndicative ? (
                  <IndicativeYearForm
                    year={selectedYear}
                    state={state}
                    onUpdateMonth={(monthIndex, patch) => updateMonth(selectedYear.id, monthIndex, patch)}
                  />
                ) : (
                  <MonthlyTable
                    year={selectedYear}
                    state={state}
                    onUpdateMonth={(monthIndex, patch) => updateMonth(selectedYear.id, monthIndex, patch)}
                  />
                ))}

              {tab === 'summary' && (
                <div className="space-y-8">
                  <YearSummary
                    year={selectedYear}
                    priorYear={priorYear}
                    onSetPoaOverride={(override) => setPoaOverrideForYear(selectedYear.id, override)}
                  />
                  {selectedYear.isIndicative ? (
                    <p className="text-sm text-slate-400">
                      This year is entered as yearly totals, so a month-on-month savings curve isn't shown.
                    </p>
                  ) : (
                    <SavingsChart year={selectedYear} />
                  )}
                </div>
              )}

              {tab === 'prediction' && (
                <PredictionView
                  year={selectedYear}
                  priorYear={priorYear}
                  onSetPrediction={(prediction) => setPrediction(selectedYear.id, prediction)}
                />
              )}

              {tab === 'timeline' && <TimelineView state={state} onSetOpeningBalance={setOpening} />}

              {tab === 'payments' && (
                <PaymentsLedger state={state} onSetFollowingYearEstimate={setFollowingYearEstimate} />
              )}

              {tab === 'rates' && (
                <RatesEditor rates={selectedYear.rates} onChange={(patch) => updateRates(selectedYear.id, patch)} />
              )}
            </>
          )}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-8 text-xs text-slate-400">
        Estimates only, for planning purposes - not tax advice. Figures are calculated from rest-of-UK (England,
        Wales, Northern Ireland) income tax, dividend tax and Capital Gains Tax rules, including relief-at-source
        pension contributions and Gift Aid. They don't account for Scottish income tax rates, marriage allowance,
        the High Income Child Benefit Charge, student loan repayments, or other reliefs. All data is stored
        locally in your browser.
      </footer>
    </div>
  );
}

export default App;
