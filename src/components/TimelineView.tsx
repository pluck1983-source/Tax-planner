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
import type { PlannerState } from '../lib/types';
import { calculateTimeline } from '../lib/taxEngine';
import { formatGBP } from '../lib/format';

interface Props {
  state: PlannerState;
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

export function TimelineView({ state }: Props) {
  const timeline = calculateTimeline(state);
  const latest = timeline.at(-1);

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

      {!latest && <p className="text-slate-400">Add a tax year with some months entered to see the timeline.</p>}

      {latest && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total tax liability to date" value={formatGBP(latest.cumulativeLiability)} />
            <StatCard label="Total paid to HMRC" value={formatGBP(latest.cumulativePaidToHmrc)} />
            <StatCard
              label="Outstanding liability"
              value={formatGBP(latest.outstandingLiability)}
              sub="Owed, not yet paid"
            />
            <StatCard label="Total saved" value={formatGBP(latest.cumulativeSaved)} />
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
