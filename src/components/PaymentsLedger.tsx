import type { PlannerState } from '../lib/types';
import { calculatePaymentLedger, estimateFollowingYear } from '../lib/taxEngine';
import { formatDate, formatGBP } from '../lib/format';

interface Props {
  state: PlannerState;
  onSetFollowingYearEstimate: (show: boolean) => void;
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  upcoming: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  overdue: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  estimated: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  partial: 'Partially paid',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  estimated: 'Estimated',
};

export function PaymentsLedger({ state, onSetFollowingYearEstimate }: Props) {
  const groups = calculatePaymentLedger(state);
  const estimate = estimateFollowingYear(state);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Every payment on account and balancing payment across every tax year on record, in one place for quick
        reference. A year's payment on account 1 always shares its 31 January due date with the prior year's
        balancing payment.
      </p>

      {estimate?.schedule.poa1 && estimate.schedule.poa2 && (
        <label className="flex items-start gap-2 text-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
          <input
            type="checkbox"
            checked={state.showFollowingYearEstimate}
            onChange={(e) => onSetFollowingYearEstimate(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Show an estimate for {estimate.followingYearLabel}
            </span>
            <span className="block text-xs text-slate-400 mt-0.5 max-w-xl">
              Projects payment on account 1 and 2 for {estimate.followingYearLabel} using {estimate.basisYearLabel}'s
              liability as the basis (not the latest year on record, which may still be in progress and understate
              a full year). Also extends the Timeline chart with a dashed projection.
            </span>
          </span>
        </label>
      )}

      {groups.length === 0 && (
        <p className="text-slate-400">
          Nothing due yet - add income to a tax year (and a prior year, so payments on account can be worked out)
          to see payments here.
        </p>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={`${group.dueDate}-${group.estimated ? 'est' : 'real'}`}
            className={`rounded-xl border bg-white p-4 dark:bg-slate-800 ${
              group.estimated
                ? 'border-dashed border-indigo-200 dark:border-indigo-800'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(group.dueDate)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[group.status]}`}>
                  {STATUS_LABELS[group.status]}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Total due</div>
                <div className="font-semibold tabular-nums">{formatGBP(group.totalExpected)}</div>
              </div>
            </div>

            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-3">
              {group.items.map((item) => (
                <li key={item.label} className="flex justify-between">
                  <span>{item.label}</span>
                  <span className="tabular-nums">{formatGBP(item.amount)}</span>
                </li>
              ))}
            </ul>

            {group.estimated ? (
              <div className="text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                Not a real obligation yet - a rough projection to help you plan ahead.
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm border-t border-slate-100 dark:border-slate-700 pt-2">
                  <span className="text-slate-500 dark:text-slate-400">Actually paid</span>
                  <span className="tabular-nums">
                    {group.actualPaid === null ? (
                      <span className="text-slate-400">Not on record</span>
                    ) : (
                      formatGBP(group.actualPaid)
                    )}
                  </span>
                </div>
                {group.variance !== null && group.variance !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {group.variance > 0 ? 'Overpaid by' : 'Underpaid by'}
                    </span>
                    <span className={`tabular-nums ${group.variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatGBP(Math.abs(group.variance))}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
