import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OpeningBalance, PlannerState } from '../lib/types';
import { calculateTimeline } from '../lib/taxEngine';
import { formatGBP } from '../lib/format';

interface Props {
  state: PlannerState;
  onSetOpeningBalance: (balance: OpeningBalance | null) => void;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-800 dark:border-slate-700">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function OpeningBalancePanel({ state, onSetOpeningBalance }: Props) {
  const sortedIds = [...state.yearOrder].sort();
  const existing = state.openingBalance;
  const [open, setOpen] = useState(!!existing);
  const [yearId, setYearId] = useState(existing?.yearId ?? sortedIds[0] ?? '');
  const [savedBalance, setSavedBalance] = useState(existing?.savedBalance ?? 0);
  const [outstandingLiability, setOutstandingLiability] = useState(existing?.outstandingLiability ?? 0);

  if (sortedIds.length === 0) return null;

  function handleSave() {
    onSetOpeningBalance({ yearId, savedBalance, outstandingLiability });
  }

  function handleClear() {
    onSetOpeningBalance(null);
    setSavedBalance(0);
    setOutstandingLiability(0);
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Starting point</h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            If reconciling exact historical figures for every year is too much hassle, set a known starting point
            here - the totals above will begin from these figures at the start of the chosen year, ignoring
            earlier history entirely.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400 shrink-0"
        >
          {open ? 'Hide' : existing ? 'Edit' : 'Set a starting point'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">As of the start of</span>
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              {sortedIds.map((id) => (
                <option key={id} value={id}>
                  {state.years[id].rates.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Bank balance for tax</span>
            <input
              type="number"
              inputMode="decimal"
              value={savedBalance === 0 ? '' : savedBalance}
              placeholder="0"
              onChange={(e) => setSavedBalance(e.target.value === '' ? 0 : Number(e.target.value))}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Outstanding tax owed</span>
            <input
              type="number"
              inputMode="decimal"
              value={outstandingLiability === 0 ? '' : outstandingLiability}
              placeholder="0"
              onChange={(e) => setOutstandingLiability(e.target.value === '' ? 0 : Number(e.target.value))}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {existing ? 'Update' : 'Set'}
            </button>
            {existing && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs px-3 py-1.5 rounded border border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineView({ state, onSetOpeningBalance }: Props) {
  const timeline = calculateTimeline(state);
  const latest = timeline.at(-1);
  const openingLabel = state.openingBalance ? state.years[state.openingBalance.yearId]?.rates.label : null;

  const data = timeline.map((p) => ({
    label: p.label,
    'Outstanding liability': Math.round(p.outstandingLiability),
    'Bank balance': Math.round(p.bankBalance),
  }));

  const paymentPoints = timeline.filter((p) => p.hmrcPaymentMade !== 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Runs continuously across every tax year on record - tax liability keeps accruing and only goes down when
        you record an actual payment to HMRC, so this tracks what should be in the bank right now, not just this
        year's figures.
      </p>

      <OpeningBalancePanel state={state} onSetOpeningBalance={onSetOpeningBalance} />

      {!latest && <p className="text-slate-400">Add a tax year with some months entered to see the timeline.</p>}

      {latest && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label={openingLabel ? `Total tax liability since ${openingLabel}` : 'Total tax liability to date'}
              value={formatGBP(latest.cumulativeLiability)}
            />
            <StatCard
              label={openingLabel ? `Total paid since ${openingLabel}` : 'Total paid to HMRC'}
              value={formatGBP(latest.cumulativePaidToHmrc)}
            />
            <StatCard
              label="Outstanding liability"
              value={formatGBP(latest.outstandingLiability)}
              sub="Owed, not yet paid"
            />
            <StatCard
              label={openingLabel ? `Total saved since ${openingLabel}` : 'Total saved'}
              value={formatGBP(latest.cumulativeSaved)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Bank balance" value={formatGBP(latest.bankBalance)} sub="Saved minus paid out" />
            <StatCard
              label={latest.bankBalance - latest.outstandingLiability >= 0 ? 'Surplus' : 'Shortfall'}
              value={formatGBP(Math.abs(latest.bankBalance - latest.outstandingLiability))}
              sub="Bank balance vs outstanding liability"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Outstanding liability vs. bank balance, across all years
            </h3>
            <div className="h-80 rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-800 dark:border-slate-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="label" fontSize={11} interval="preserveStartEnd" />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `£${Math.round(v / 1000)}k` : `£${v}`)}
                    width={56}
                  />
                  <Tooltip formatter={(value) => formatGBP(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="Outstanding liability" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Bank balance" stroke="#16a34a" strokeWidth={2} dot={false} />
                  {paymentPoints.map((p) => (
                    <ReferenceDot
                      key={`${p.yearId}-${p.monthIndex}`}
                      x={p.label}
                      y={Math.round(p.bankBalance)}
                      r={5}
                      fill={p.hmrcPaymentMade > 0 ? '#dc2626' : '#16a34a'}
                      stroke="none"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Dots mark months with an actual HMRC payment or refund recorded.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
