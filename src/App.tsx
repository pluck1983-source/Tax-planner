import { useRef, useState } from 'react';
import { useChildminderState } from './lib/useChildminderState';
import { exportStateAsJson, importStateFromJson } from './lib/storage';
import { AgeBandsEditor } from './components/AgeBandsEditor';
import { LocalAuthorityManager } from './components/LocalAuthorityManager';
import { NonFundedRatesManager } from './components/NonFundedRatesManager';
import { ChildrenManager } from './components/ChildrenManager';
import { TermDatesManager } from './components/TermDatesManager';
import { HolidaysManager } from './components/HolidaysManager';
import { AttendanceRegister } from './components/AttendanceRegister';
import { ForecastView } from './components/ForecastView';
import { IncomeTracker } from './components/IncomeTracker';
import { TaxLiabilityView } from './components/TaxLiabilityView';

type Tab = 'forecast' | 'children' | 'terms' | 'holidays' | 'attendance' | 'income' | 'tax' | 'authorities' | 'rates';

const TABS: [Tab, string][] = [
  ['forecast', 'Forecast'],
  ['children', 'Children'],
  ['terms', 'Term dates'],
  ['holidays', 'Holidays'],
  ['attendance', 'Attendance'],
  ['income', 'Income'],
  ['tax', 'Tax'],
  ['authorities', 'Local authorities'],
  ['rates', 'My rates'],
];

function App() {
  const {
    state,
    addAgeBand,
    updateAgeBand,
    deleteAgeBand,
    addLocalAuthority,
    updateLocalAuthority,
    deleteLocalAuthority,
    addFundingRate,
    deleteFundingRate,
    addNonFundedRate,
    deleteNonFundedRate,
    addLatePickupRate,
    deleteLatePickupRate,
    addChild,
    updateChild,
    deleteChild,
    addAttendancePatternChange,
    deleteAttendancePatternChange,
    addHoliday,
    deleteHoliday,
    addTerm,
    updateTerm,
    deleteTerm,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    addFundingPaymentReceived,
    deleteFundingPaymentReceived,
    addParentPaymentReceived,
    deleteParentPaymentReceived,
    addTaxYear,
    updateTaxYear,
    deleteTaxYear,
    selectTaxYear,
    replaceState,
  } = useChildminderState();

  const [tab, setTab] = useState<Tab>('forecast');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([exportStateAsJson(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'childminder-tracker-data.json';
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
        alert('Could not read that file - is it a Childminder Tracker export?');
      }
    });
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Childminder Income Tracker</h1>
            <p className="text-xs text-slate-400">Rates, funding, forecasting and attendance in one place</p>
          </div>
          <div className="flex gap-2 no-print shrink-0">
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800 no-print overflow-x-auto [-webkit-overflow-scrolling:touch]">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                tab === id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'forecast' && <ForecastView state={state} />}

        {tab === 'children' && (
          <ChildrenManager
            childRecords={state.children}
            localAuthorities={state.localAuthorities}
            ageBands={state.ageBands}
            onAdd={addChild}
            onUpdate={updateChild}
            onDelete={deleteChild}
            onAddPatternChange={addAttendancePatternChange}
            onDeletePatternChange={deleteAttendancePatternChange}
          />
        )}

        {tab === 'terms' && <TermDatesManager terms={state.terms} onAdd={addTerm} onUpdate={updateTerm} onDelete={deleteTerm} />}

        {tab === 'holidays' && <HolidaysManager holidays={state.holidays} childRecords={state.children} onAdd={addHoliday} onDelete={deleteHoliday} />}

        {tab === 'attendance' && (
          <AttendanceRegister
            attendance={state.attendance}
            childRecords={state.children}
            rates={state.rates}
            onAdd={addAttendance}
            onUpdate={updateAttendance}
            onDelete={deleteAttendance}
          />
        )}

        {tab === 'income' && (
          <IncomeTracker
            state={state}
            onAddFunding={addFundingPaymentReceived}
            onDeleteFunding={deleteFundingPaymentReceived}
            onAddParent={addParentPaymentReceived}
            onDeleteParent={deleteParentPaymentReceived}
          />
        )}

        {tab === 'tax' && (
          <TaxLiabilityView state={state} onAddYear={addTaxYear} onUpdateYear={updateTaxYear} onDeleteYear={deleteTaxYear} onSelectYear={selectTaxYear} />
        )}

        {tab === 'authorities' && (
          <div className="space-y-6">
            <AgeBandsEditor ageBands={state.ageBands} onAdd={addAgeBand} onUpdate={updateAgeBand} onDelete={deleteAgeBand} />
            <LocalAuthorityManager
              localAuthorities={state.localAuthorities}
              ageBands={state.ageBands}
              onAdd={addLocalAuthority}
              onUpdate={updateLocalAuthority}
              onDelete={deleteLocalAuthority}
              onAddRate={addFundingRate}
              onDeleteRate={deleteFundingRate}
            />
          </div>
        )}

        {tab === 'rates' && (
          <NonFundedRatesManager
            rates={state.rates}
            ageBands={state.ageBands}
            onAddNonFunded={addNonFundedRate}
            onDeleteNonFunded={deleteNonFundedRate}
            onAddLatePickup={addLatePickupRate}
            onDeleteLatePickup={deleteLatePickupRate}
          />
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-8 text-xs text-slate-400">
        Figures are estimates for planning purposes only. Funded-hours eligibility follows the standard "term after
        the count date (1 Jan/1 Apr/1 Sep) on or after the qualifying birthday" rule - always confirm exact starting
        terms with your local authority. All data is stored locally in your browser.
      </footer>
    </div>
  );
}

export default App;
