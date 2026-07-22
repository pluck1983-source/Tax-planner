import type { MonthlyEntry, PlannerState, TaxYearData } from '../lib/types';
import { getIndicativeTotals } from '../lib/storage';
import { startYearFromYearId } from '../lib/defaultRates';
import { calculateExpectedHmrcPayment, estimatePayeTax } from '../lib/taxEngine';
import { formatGBP } from '../lib/format';

interface Props {
  year: TaxYearData;
  state: PlannerState;
  onUpdateMonth: (monthIndex: number, patch: Partial<MonthlyEntry>) => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  title,
  allowNegative,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  title?: string;
  /** iOS's "decimal" keypad has no minus key, so fields that can legitimately go negative fall back to the default number keypad, which does. */
  allowNegative?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        inputMode={allowNegative ? undefined : 'decimal'}
        title={title}
        className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
        value={value === 0 ? '' : value}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

export function IndicativeYearForm({ year, state, onUpdateMonth }: Props) {
  const totals = getIndicativeTotals(year);
  const estimatedPaye = estimatePayeTax(year.rates, totals.paye);
  const startYear = startYearFromYearId(year.id);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        This year is entered as totals for the whole year rather than month by month - handy for an earlier year
        you just want to seed for payments-on-account purposes. Switch back to monthly entry any time from the
        button above.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Salary (PAYE)" value={totals.paye} onChange={(v) => onUpdateMonth(0, { paye: v })} />
        <Field
          label="PAYE tax deducted"
          value={totals.payeTaxDeducted ?? 0}
          placeholder={estimatedPaye ? String(Math.round(estimatedPaye)) : '0'}
          title="Leave blank to auto-estimate from salary using a standard tax code"
          onChange={(v) => onUpdateMonth(0, { payeTaxDeducted: v === 0 ? null : v })}
        />
        <Field
          label="Dividends (company)"
          value={totals.dividendsEmployment}
          onChange={(v) => onUpdateMonth(0, { dividendsEmployment: v })}
        />
        <Field
          label="Dividends (share dealing)"
          value={totals.dividendsShareDealing}
          onChange={(v) => onUpdateMonth(0, { dividendsShareDealing: v })}
        />
        <Field label="Other income" value={totals.otherIncome} onChange={(v) => onUpdateMonth(0, { otherIncome: v })} />
        <Field
          label="Interest (untaxed)"
          value={totals.savingsInterest}
          title="Untaxed UK bank/building society interest across the year"
          onChange={(v) => onUpdateMonth(0, { savingsInterest: v })}
        />
        <Field
          label="Pension contributions"
          value={totals.pensionContribution}
          title="Net amount paid into a personal (relief-at-source) pension across the year"
          onChange={(v) => onUpdateMonth(0, { pensionContribution: v })}
        />
        <Field
          label="Gift Aid"
          value={totals.giftAid}
          title="Net Gift Aid donations across the year"
          onChange={(v) => onUpdateMonth(0, { giftAid: v })}
        />
        <Field
          label="Capital gains"
          value={totals.capitalGains}
          title="Net chargeable gains realised across the year, before the annual exempt amount"
          onChange={(v) => onUpdateMonth(0, { capitalGains: v })}
        />
        <Field
          label="Total saved"
          value={totals.savedThisMonth}
          title="Negative = money taken back out of savings across the year (e.g. a surplus withdrawn but not paid to HMRC)"
          allowNegative
          onChange={(v) => onUpdateMonth(0, { savedThisMonth: v })}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Paid to HMRC</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field
            label={`Paid in January ${startYear + 1}`}
            value={totals.hmrcPaymentJan}
            placeholder={String(Math.round(calculateExpectedHmrcPayment(state, year.id, 9)))}
            title="Payment on account 1 + the prior year's balancing payment, both due 31 January (negative = a refund received)"
            allowNegative
            onChange={(v) => onUpdateMonth(9, { hmrcPaymentMade: v })}
          />
          <Field
            label={`Paid in July ${startYear}`}
            value={totals.hmrcPaymentJul}
            placeholder={String(Math.round(calculateExpectedHmrcPayment(state, year.id, 3)))}
            title="The prior year's payment on account 2, due 31 July (negative = a refund received)"
            allowNegative
            onChange={(v) => onUpdateMonth(3, { hmrcPaymentMade: v })}
          />
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total paid to HMRC</span>
            <div className="px-2 py-1.5 rounded border border-slate-100 bg-slate-50 text-right tabular-nums font-medium dark:bg-slate-900 dark:border-slate-800">
              {formatGBP(totals.hmrcPaymentJan + totals.hmrcPaymentJul)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
