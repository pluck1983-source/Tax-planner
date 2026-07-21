import type { PlannerState } from '../lib/types';

interface Props {
  state: PlannerState;
  onSelect: (yearId: string) => void;
  onAddYear: () => void;
  onAddPriorYear: () => void;
}

export function YearSidebar({ state, onSelect, onAddYear, onAddPriorYear }: Props) {
  const sortedIds = [...state.yearOrder].sort();

  return (
    <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible md:w-48 shrink-0">
      <button
        type="button"
        onClick={onAddPriorYear}
        title="Add the tax year before your earliest one - useful for seeding payments on account correctly"
        className="text-left px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 whitespace-nowrap dark:border-slate-600 dark:text-slate-400"
      >
        + Add earlier year
      </button>
      {sortedIds.map((id) => {
        const year = state.years[id];
        const isSelected = id === state.selectedYearId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`text-left px-3 py-2 rounded-lg border whitespace-nowrap transition-colors ${
              isSelected
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
            }`}
          >
            {year.rates.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAddYear}
        className="text-left px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 whitespace-nowrap dark:border-slate-600 dark:text-slate-400"
      >
        + Add next year
      </button>
    </nav>
  );
}
