import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TaxYearData } from '../lib/types';
import { MONTH_LABELS } from '../lib/types';
import { calculateMonthlyProgress } from '../lib/taxEngine';
import { formatGBP } from '../lib/format';

interface Props {
  year: TaxYearData;
}

export function SavingsChart({ year }: Props) {
  const progress = calculateMonthlyProgress(year);
  const data = progress.map((p) => ({
    month: MONTH_LABELS[p.monthIndex],
    Target: Math.round(p.cumulativeTargetLiability),
    Saved: Math.round(p.cumulativeSaved),
  }));

  const latest = progress.at(-1);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
        Amount to have saved by month-end (cumulative, this year's tax only)
      </h3>
      <div className="h-72 rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-800 dark:border-slate-700">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis
              fontSize={12}
              tickFormatter={(v) => (v >= 1000 ? `£${Math.round(v / 1000)}k` : `£${v}`)}
              width={56}
            />
            <Tooltip formatter={(value) => formatGBP(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="Target" stroke="#4f46e5" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Saved" stroke="#16a34a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {latest && (
        <p className="text-sm text-slate-500 mt-2">
          As of the last month entered, you should have saved{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatGBP(latest.cumulativeTargetLiability)}
          </span>{' '}
          towards this year's tax bill. You've logged{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatGBP(latest.cumulativeSaved)}
          </span>{' '}
          saved, a{' '}
          <span className={latest.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {latest.variance >= 0 ? 'surplus' : 'shortfall'} of {formatGBP(Math.abs(latest.variance))}
          </span>
          .
        </p>
      )}
    </div>
  );
}
