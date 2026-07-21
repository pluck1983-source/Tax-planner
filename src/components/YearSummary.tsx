import type { TaxYearData } from '../lib/types';
import { calculatePaymentsOnAccount, calculateYearLiability } from '../lib/taxEngine';
import { formatDate, formatGBP } from '../lib/format';

interface Props {
  year: TaxYearData;
  priorYear: TaxYearData | null;
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

export function YearSummary({ year, priorYear }: Props) {
  const liability = calculateYearLiability(year);
  const poa = calculatePaymentsOnAccount(year, priorYear);
  const { totals, taxBreakdown, capitalGains } = liability;
  const hasReliefs = totals.pensionContribution > 0 || totals.giftAid > 0;
  const hasGains = totals.capitalGains > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total income" value={formatGBP(taxBreakdown.totalIncome)} />
        <StatCard label="Income & dividend tax" value={formatGBP(taxBreakdown.totalTax)} />
        <StatCard label="Collected via PAYE" value={formatGBP(totals.payeTaxDeducted)} />
        <StatCard
          label="Income tax self-assessment"
          value={formatGBP(liability.incomeTaxSelfAssessmentLiability)}
          sub="Owed on top of PAYE"
        />
      </div>

      {(hasGains || hasReliefs) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {hasReliefs && (
            <StatCard
              label="Personal allowance"
              value={formatGBP(taxBreakdown.personalAllowance)}
              sub={`Basic-rate band extended to ${formatGBP(taxBreakdown.extendedBasicRateBandWidth)} by pension/Gift Aid`}
            />
          )}
          {hasGains && (
            <>
              <StatCard label="Taxable capital gains" value={formatGBP(capitalGains.taxableGains)} />
              <StatCard label="Capital Gains Tax" value={formatGBP(capitalGains.tax)} />
              <StatCard
                label="Total self-assessment"
                value={formatGBP(liability.totalSelfAssessmentLiability)}
                sub="Income tax + CGT"
              />
            </>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Likely payments on account &amp; balancing payment
        </h3>
        {!priorYear && (
          <p className="text-sm text-slate-400 mb-2">
            No prior year on record - payments on account can't be estimated without it. Add the previous tax year
            to see them here.
          </p>
        )}
        {priorYear && !poa.required && (
          <p className="text-sm text-slate-400 mb-2">
            Based on {priorYear.rates.label}, payments on account aren't expected to be required for{' '}
            {year.rates.label} (prior liability was under the {formatGBP(year.rates.poaThreshold)} threshold, or
            enough tax was already collected at source).
          </p>
        )}
        {hasGains && (
          <p className="text-sm text-slate-400 mb-2">
            Capital Gains Tax is excluded from payments on account (HMRC bases those on income tax alone) and is
            instead added in full to the balancing payment below.
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
    </div>
  );
}
