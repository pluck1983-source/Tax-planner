import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatWeekLabel } from '../lib/dateUtils';
import { formatGBP } from '../lib/format';
import type { WeekForecast } from '../lib/forecastEngine';

interface Props {
  weeks: WeekForecast[];
}

export function ForecastChart({ weeks }: Props) {
  const data = weeks.map((w) => ({
    label: formatWeekLabel(w.weekStart),
    Parental: Math.round(w.breakdowns.reduce((s, b) => s + b.nonFundedAmount, 0)),
    Funding: Math.round(w.breakdowns.reduce((s, b) => s + b.fundedAmount, 0)),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatGBP(v)} width={64} />
          <Tooltip formatter={(v) => formatGBP(Number(v ?? 0))} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Parental" stackId="income" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Funding" stackId="income" fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
