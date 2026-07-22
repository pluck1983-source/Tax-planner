import { useState } from 'react';
import type { PoaOverride, TaxYearData } from '../lib/types';
import { calculatePaymentsOnAccount, calculateYearLiability } from '../lib/taxEngine';
import { formatDate, formatGBP } from '../lib/format';

interface Props {
  year: TaxYearData;
  priorYear: TaxYearData | null;
  onSetPoaOverride: (override: PoaOverride | null) => void;
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

function PoaOverridePanel({ year, onSetPoaOverride }: Pick<Props, 'year' | 'onSetPoaOverride'>) {
  const existing = year.poaOverride;
  const [open, setOpen] = useState(!!existing);
  const [poa1, setPoa1] = useState(existing?.poa1 ?? 0);
  const [poa2, setPoa2] = useState(existing?.poa2 ?? 0);

  function handleSave() {
    onSetPoaOverride({ poa1, poa2 });
  }

  function handleClear() {
    onSetPoaOverride(null);
    setPoa1(0);
    setPoa2(0);
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 mb-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Known payment on account</h4>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            If you already know the actual payment on account amounts HMRC has set for this year - e.g. from your
            self-assessment statement - enter them here instead of relying on the prior year's calculation (handy
            if the prior year isn't on record, or its figures here aren't accurate).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400 shrink-0"
        >
          {open ? 'Hide' : existing ? 'Edit' : 'Set known amounts'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Payment on account 1 (31 Jan)</span>
            <input
              type="number"
              inputMode="decimal"
              value={poa1 === 0 ? '' : poa1}
              placeholder="0"
              onChange={(e) => setPoa1(e.target.value === '' ? 0 : Number(e.target.value))}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Payment on account 2 (31 Jul)</span>
            <input
              type="number"
              inputMode="decimal"
              value={poa2 === 0 ? '' : poa2}
              placeholder="0"
              onChange={(e) => setPoa2(e.target.value === '' ? 0 : Number(e.target.value))}
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
            />
          </label>
          <div className="flex items-end gap-2 col-span-2">
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

export function YearSummary({ year, priorYear, onSetPoaOverride }: Props) {
  const liability = calculateYearLiability(year);
  const poa = calculatePaymentsOnAccount(year, priorYear);
  const { totals, taxBreakdown, capitalGains } = liability;
  const hasReliefs = totals.pensionContribution > 0 || totals.giftAid > 0;
  const hasGains = totals.capitalGains > 0;
  const hasSavingsInterest = totals.savingsInterest > 0;

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

      {(hasGains || hasReliefs || hasSavingsInterest) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {hasReliefs && (
            <StatCard
              label="Personal allowance"
              value={formatGBP(taxBreakdown.personalAllowance)}
              sub={`Basic-rate band extended to ${formatGBP(taxBreakdown.extendedBasicRateBandWidth)} by pension/Gift Aid`}
            />
          )}
          {hasSavingsInterest && (
            <StatCard
              label="Tax-free on interest"
              value={formatGBP(
                taxBreakdown.startingRateForSavingsRemaining + taxBreakdown.personalSavingsAllowance,
              )}
              sub={`${formatGBP(taxBreakdown.startingRateForSavingsRemaining)} starting rate band + ${formatGBP(taxBreakdown.personalSavingsAllowance)} Personal Savings Allowance`}
            />
          )}
          {hasSavingsInterest && (
            <StatCard label="Tax on interest" value={formatGBP(taxBreakdown.savingsTax)} />
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
        <PoaOverridePanel year={year} onSetPoaOverride={onSetPoaOverride} />
        {year.poaOverride && (
          <p className="text-sm text-slate-400 mb-2">
            Using the known payment on account amounts you entered above, rather than a calculation from the prior
            year.
          </p>
        )}
        {!year.poaOverride && !priorYear && (
          <p className="text-sm text-slate-400 mb-2">
            No prior year on record - payments on account can't be estimated without it. Add the previous tax year,
            or enter the known amounts above if you have them.
          </p>
        )}
        {!year.poaOverride && priorYear && !poa.required && (
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
