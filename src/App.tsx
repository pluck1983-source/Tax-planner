import { useRef, useState } from 'react';
import { usePlannerState } from './lib/usePlannerState';
import { startYearFromYearId, yearIdFromStartYear } from './lib/defaultRates';
import { exportStateAsJson, importStateFromJson } from './lib/storage';
import { YearSidebar } from './components/YearSidebar';
import { MonthlyTable } from './components/MonthlyTable';
import { YearSummary } from './components/YearSummary';
import { SavingsChart } from './components/SavingsChart';
import { RatesEditor } from './components/RatesEditor';
import { TimelineView } from './components/TimelineView';
import { PaymentsLedger } from './components/PaymentsLedger';

type Tab = 'monthly' | 'summary' | 'timeline' | 'payments' | 'rates';

function App() {
  const { state, selectYear, addYear, addPriorYear, updateMonth, updateRates, replaceState } = usePlannerState();
  const [tab, setTab] = useState<Tab>('monthly');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedYear = state.selectedYearId ? state.years[state.selectedYearId] : null;
  const priorYearId = selectedYear ? yearIdFromStartYear(startYearFromYearId(selectedYear.id) - 1) : null;
  const priorYear = priorYearId ? (state.years[priorYearId] ?? null) : null;

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedYear.rates.label} tax year</h2>
                <p className="text-xs text-slate-400">
                  {new Date(selectedYear.rates.startDate).toLocaleDateString('en-GB')} -{' '}
                  {new Date(selectedYear.rates.endDate).toLocaleDateString('en-GB')}
                </p>
              </div>

              <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-800 no-print">
                {(
                  [
                    ['monthly', 'Monthly entries'],
                    ['summary', 'Summary & payments'],
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

              {tab === 'monthly' && (
                <MonthlyTable
                  year={selectedYear}
                  state={state}
                  onUpdateMonth={(monthIndex, patch) => updateMonth(selectedYear.id, monthIndex, patch)}
                />
              )}

              {tab === 'summary' && (
                <div className="space-y-8">
                  <YearSummary year={selectedYear} priorYear={priorYear} />
                  <SavingsChart year={selectedYear} />
                </div>
              )}

              {tab === 'timeline' && <TimelineView state={state} />}

              {tab === 'payments' && <PaymentsLedger state={state} />}

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
