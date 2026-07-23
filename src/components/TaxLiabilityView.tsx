import { useMemo, useState } from 'react';
import { computeRemainingYearForecastTotal } from '../lib/forecastEngine';
import { formatDate, formatGBP } from '../lib/format';
import { computeTaxLiability, defaultTaxYearSettings, taxYearStartForDate } from '../lib/taxEngine';
import type { ChildminderState, TaxYearSettings } from '../lib/types';
import { Card, NumberField, SelectField, SmallButton } from './ui';

interface Props {
  state: ChildminderState;
  onAddYear: (year: TaxYearSettings) => void;
  onUpdateYear: (id: string, patch: Partial<TaxYearSettings>) => void;
  onDeleteYear: (id: string) => void;
  onSelectYear: (id: string) => void;
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return <NumberField label={label} value={value} onChange={onChange} suffix={suffix} min={0} />;
}

export function TaxLiabilityView({ state, onAddYear, onUpdateYear, onDeleteYear, onSelectYear }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const selected = state.taxYears.find((y) => y.id === state.selectedTaxYearId) ?? state.taxYears[0] ?? null;

  const confirmedIncome = useMemo(() => {
    if (!selected) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = today < selected.endDate ? today : selected.endDate;
    const funding = state.fundingPaymentsReceived
      .filter((r) => r.date >= selected.startDate && r.date <= cutoff)
      .reduce((s, r) => s + r.amount, 0);
    const parent = state.parentPaymentsReceived
      .filter((r) => r.date >= selected.startDate && r.date <= cutoff)
      .reduce((s, r) => s + r.amount, 0);
    return funding + parent;
  }, [state.fundingPaymentsReceived, state.parentPaymentsReceived, selected]);

  const remainingForecast = useMemo(() => (selected ? computeRemainingYearForecastTotal(state, selected.endDate) : 0), [state, selected]);
  const forecastFullYearIncome = confirmedIncome + remainingForecast;

  const confirmedLiability = selected ? computeTaxLiability(confirmedIncome, selected.expensesToDate, selected) : null;
  const forecastLiability = selected ? computeTaxLiability(forecastFullYearIncome, selected.projectedFullYearExpenses, selected) : null;

  function handleAddYear(direction: 1 | -1) {
    const latestOrEarliest = [...state.taxYears].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const edge = direction === 1 ? latestOrEarliest.at(-1) : latestOrEarliest[0];
    const startYear = edge ? Number(edge.id.slice(0, 4)) + direction : taxYearStartForDate(new Date());
    const next = defaultTaxYearSettings(startYear);
    if (state.taxYears.some((y) => y.id === next.id)) {
      onSelectYear(next.id);
      return;
    }
    onAddYear(next);
  }

  if (!selected) {
    return (
      <Card>
        <p className="text-sm text-slate-400 mb-3">No tax year set up yet.</p>
        <SmallButton variant="primary" onClick={() => handleAddYear(1)}>
          Add current tax year
        </SmallButton>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Estimates only, not tax advice - assumes childminding is your only income, uses rest-of-UK (England/Wales/NI)
        rates, and doesn't apply the personal allowance taper above £100,000 of profit. Figures are based on the
        income logged in the Income tab and the Forecast tab's projections.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <SelectField
            label="Tax year"
            value={selected.id}
            onChange={onSelectYear}
            options={[...state.taxYears].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((y) => ({ value: y.id, label: y.label }))}
          />
        </div>
        <SmallButton onClick={() => handleAddYear(-1)}>+ Earlier year</SmallButton>
        <SmallButton onClick={() => handleAddYear(1)}>+ Next year</SmallButton>
        <SmallButton onClick={() => setShowSettings((v) => !v)}>{showSettings ? 'Hide' : 'Edit'} rates &amp; thresholds</SmallButton>
        <SmallButton
          variant="danger"
          onClick={() => {
            if (state.taxYears.length > 1 && window.confirm(`Delete ${selected.label}?`)) onDeleteYear(selected.id);
          }}
        >
          Delete year
        </SmallButton>
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Allowable expenses</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Expenses recorded to date" value={selected.expensesToDate} onChange={(v) => onUpdateYear(selected.id, { expensesToDate: v })} suffix="£" />
          <Field
            label="Estimated expenses for the full year"
            value={selected.projectedFullYearExpenses}
            onChange={(v) => onUpdateYear(selected.id, { projectedFullYearExpenses: v })}
            suffix="£"
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          The £{selected.tradingAllowance} tax-free trading allowance is used automatically instead if it's larger
          than the expenses entered here.
        </p>
      </Card>

      {showSettings && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Rates &amp; thresholds - {selected.label}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Field label="Personal allowance" value={selected.personalAllowance} onChange={(v) => onUpdateYear(selected.id, { personalAllowance: v })} suffix="£" />
            <Field label="Basic rate band width" value={selected.basicRateBandWidth} onChange={(v) => onUpdateYear(selected.id, { basicRateBandWidth: v })} suffix="£" />
            <Field
              label="Additional rate threshold"
              value={selected.additionalRateThreshold}
              onChange={(v) => onUpdateYear(selected.id, { additionalRateThreshold: v })}
              suffix="£"
            />
            <NumberField label="Basic rate" value={selected.basicRate} onChange={(v) => onUpdateYear(selected.id, { basicRate: v })} suffix="decimal" step="0.01" />
            <NumberField label="Higher rate" value={selected.higherRate} onChange={(v) => onUpdateYear(selected.id, { higherRate: v })} suffix="decimal" step="0.01" />
            <NumberField label="Additional rate" value={selected.additionalRate} onChange={(v) => onUpdateYear(selected.id, { additionalRate: v })} suffix="decimal" step="0.01" />
          </div>
          <h4 className="text-xs font-semibold mb-2 text-slate-500 dark:text-slate-400">Class 4 National Insurance</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Lower limit" value={selected.class4LowerLimit} onChange={(v) => onUpdateYear(selected.id, { class4LowerLimit: v })} suffix="£" />
            <Field label="Upper limit" value={selected.class4UpperLimit} onChange={(v) => onUpdateYear(selected.id, { class4UpperLimit: v })} suffix="£" />
            <NumberField label="Lower rate" value={selected.class4LowerRate} onChange={(v) => onUpdateYear(selected.id, { class4LowerRate: v })} suffix="decimal" step="0.01" />
            <NumberField label="Upper rate" value={selected.class4UpperRate} onChange={(v) => onUpdateYear(selected.id, { class4UpperRate: v })} suffix="decimal" step="0.01" />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Class 2 NIC is no longer compulsory for most self-employed people since April 2024, so it isn't included
            here - only Income Tax and Class 4 NIC on profit.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {confirmedLiability && (
          <Card>
            <h3 className="text-sm font-semibold mb-1">Confirmed liability so far</h3>
            <p className="text-xs text-slate-400 mb-3">Based on income actually logged in the Income tab, up to {formatDate(new Date().toISOString().slice(0, 10))}</p>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Income received</dt>
                <dd className="tabular-nums">{formatGBP(confirmedLiability.income)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Deduction (expenses/trading allowance)</dt>
                <dd className="tabular-nums">-{formatGBP(confirmedLiability.deduction)}</dd>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <dt>Taxable profit</dt>
                <dd className="tabular-nums">{formatGBP(confirmedLiability.profit)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Income Tax</dt>
                <dd className="tabular-nums">{formatGBP(confirmedLiability.incomeTax)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Class 4 NIC</dt>
                <dd className="tabular-nums">{formatGBP(confirmedLiability.class4Nic)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-slate-200 dark:border-slate-700 pt-1.5">
                <dt>Total so far</dt>
                <dd className="tabular-nums">{formatGBP(confirmedLiability.total)}</dd>
              </div>
            </dl>
          </Card>
        )}

        {forecastLiability && (
          <Card>
            <h3 className="text-sm font-semibold mb-1">Forecast liability - full year</h3>
            <p className="text-xs text-slate-400 mb-3">Confirmed income to date plus the Forecast tab's projection for the rest of {selected.label}</p>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Projected full-year income</dt>
                <dd className="tabular-nums">{formatGBP(forecastLiability.income)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Deduction (expenses/trading allowance)</dt>
                <dd className="tabular-nums">-{formatGBP(forecastLiability.deduction)}</dd>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <dt>Taxable profit</dt>
                <dd className="tabular-nums">{formatGBP(forecastLiability.profit)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Income Tax</dt>
                <dd className="tabular-nums">{formatGBP(forecastLiability.incomeTax)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Class 4 NIC</dt>
                <dd className="tabular-nums">{formatGBP(forecastLiability.class4Nic)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-slate-200 dark:border-slate-700 pt-1.5">
                <dt>Total for the year</dt>
                <dd className="tabular-nums">{formatGBP(forecastLiability.total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <dt>Suggested monthly set-aside</dt>
                <dd className="tabular-nums">{formatGBP(forecastLiability.total / 12)}</dd>
              </div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}
