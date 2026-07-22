import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TaxYearData, YearPrediction } from '../lib/types';
import { MONTH_LABELS } from '../lib/types';
import { buildPredictionYear } from '../lib/storage';
import { calculateMonthlyProgress, calculatePaymentsOnAccount, calculateYearLiability, estimatePayeTax } from '../lib/taxEngine';
import { formatDate, formatGBP } from '../lib/format';

interface Props {
  year: TaxYearData;
  priorYear: TaxYearData | null;
  onSetPrediction: (prediction: YearPrediction | null) => void;
}

const EMPTY_PREDICTION: YearPrediction = {
  paye: 0,
  payeTaxDeducted: null,
  dividendsEmployment: 0,
  dividendsShareDealing: 0,
  otherIncome: 0,
  savingsInterest: 0,
  pensionContribution: 0,
  giftAid: 0,
  capitalGains: 0,
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  title,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  title?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        title={title}
        className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
        value={value === 0 ? '' : value}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  );
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

export function PredictionView({ year, priorYear, onSetPrediction }: Props) {
  const hasPrediction = year.prediction !== null;
  const prediction = year.prediction ?? EMPTY_PREDICTION;

  function update(patch: Partial<YearPrediction>) {
    onSetPrediction({ ...prediction, ...patch });
  }

  function handleClear() {
    onSetPrediction(null);
  }

  const estimatedPaye = estimatePayeTax(year.rates, prediction.paye);
  const predictedYear = buildPredictionYear(prediction, year);
  const liability = calculateYearLiability(predictedYear);
  const poa = calculatePaymentsOnAccount(predictedYear, priorYear);
  const progress = calculateMonthlyProgress(predictedYear);
  const monthlyTarget = liability.totalSelfAssessmentLiability / 12;
  const hasGains = prediction.capitalGains > 0;

  const chartData = progress.map((p) => ({
    month: MONTH_LABELS[p.monthIndex],
    Target: Math.round(p.cumulativeTargetLiability),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          A what-if forecast for {year.rates.label}, kept entirely separate from your real monthly entries below.
          Enter what you think your full-year PAYE, dividends and other income will be, and this works out roughly
          what to save each month and what the resulting payments on account would look like.
        </p>
        {hasPrediction && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400 shrink-0"
          >
            Clear forecast
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Salary (PAYE)" value={prediction.paye} onChange={(v) => update({ paye: v })} />
        <Field
          label="PAYE tax deducted"
          value={prediction.payeTaxDeducted ?? 0}
          placeholder={estimatedPaye ? String(Math.round(estimatedPaye)) : '0'}
          title="Leave blank to auto-estimate from salary using a standard tax code"
          onChange={(v) => update({ payeTaxDeducted: v === 0 ? null : v })}
        />
        <Field
          label="Dividends (company)"
          value={prediction.dividendsEmployment}
          onChange={(v) => update({ dividendsEmployment: v })}
        />
        <Field
          label="Dividends (share dealing)"
          value={prediction.dividendsShareDealing}
          onChange={(v) => update({ dividendsShareDealing: v })}
        />
        <Field label="Other income" value={prediction.otherIncome} onChange={(v) => update({ otherIncome: v })} />
        <Field
          label="Interest (untaxed)"
          value={prediction.savingsInterest}
          onChange={(v) => update({ savingsInterest: v })}
        />
        <Field
          label="Pension contributions"
          value={prediction.pensionContribution}
          onChange={(v) => update({ pensionContribution: v })}
        />
        <Field label="Gift Aid" value={prediction.giftAid} onChange={(v) => update({ giftAid: v })} />
        <Field
          label="Capital gains"
          value={prediction.capitalGains}
          onChange={(v) => update({ capitalGains: v })}
        />
      </div>

      {!hasPrediction && (
        <p className="text-slate-400 text-sm">Enter your predicted figures above to see the forecast.</p>
      )}

      {hasPrediction && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Predicted total income" value={formatGBP(liability.taxBreakdown.totalIncome)} />
            <StatCard label="Predicted income &amp; dividend tax" value={formatGBP(liability.taxBreakdown.totalTax)} />
            <StatCard
              label="Predicted self-assessment"
              value={formatGBP(
                hasGains ? liability.totalSelfAssessmentLiability : liability.incomeTaxSelfAssessmentLiability,
              )}
              sub={hasGains ? 'Income tax + CGT' : 'Owed on top of PAYE'}
            />
            <StatCard
              label="Save per month"
              value={formatGBP(monthlyTarget)}
              sub="Predicted liability spread evenly across the year"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Predicted payments on account &amp; balancing payment
            </h3>
            {!year.poaOverride && !priorYear && (
              <p className="text-sm text-slate-400 mb-2">
                No prior year on record and no known payment on account set for {year.rates.label} - so payments
                on account aren't estimated here, and the whole predicted liability shows as a single balancing
                payment. Set a known payment on account on the Summary tab, or add the previous tax year, for a
                more accurate split.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-2 font-medium">Payment</th>
                    <th className="py-2 px-2 font-medium">Due date</th>
                    <th className="py-2 pl-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {poa.poa1 && (
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-2">{poa.poa1.label}</td>
                      <td className="py-1.5 px-2">{formatDate(poa.poa1.dueDate)}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">{formatGBP(poa.poa1.amount)}</td>
                    </tr>
                  )}
                  {poa.poa2 && (
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-2">{poa.poa2.label}</td>
                      <td className="py-1.5 px-2">{formatDate(poa.poa2.dueDate)}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">{formatGBP(poa.poa2.amount)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-100 dark:border-slate-800 font-medium">
                    <td className="py-1.5 pr-2">
                      {poa.balancingPayment.amount < 0 ? 'Refund due (POAs overpaid)' : poa.balancingPayment.label}
                    </td>
                    <td className="py-1.5 px-2">{formatDate(poa.balancingPayment.dueDate)}</td>
                    <td
                      className={`py-1.5 pl-2 text-right tabular-nums ${
                        poa.balancingPayment.amount < 0 ? 'text-emerald-600' : ''
                      }`}
                    >
                      {formatGBP(Math.abs(poa.balancingPayment.amount))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Predicted amount to have saved by month-end (cumulative)
            </h3>
            <div className="h-72 rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-800 dark:border-slate-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => (v >= 1000 ? `£${Math.round(v / 1000)}k` : `£${v}`)}
                    width={56}
                  />
                  <Tooltip formatter={(value) => formatGBP(Number(value))} />
                  <Line type="monotone" dataKey="Target" stroke="#4f46e5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Spread evenly across the year, since a forecast has no real monthly pattern yet - your actual monthly
              entries (and their own savings chart on the Summary tab) can follow a different shape.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
