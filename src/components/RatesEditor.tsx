import type { TaxYearRates } from '../lib/types';

interface Props {
  rates: TaxYearRates;
  onChange: (patch: Partial<TaxYearRates>) => void;
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
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="any"
          className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="text-slate-400 text-xs">{suffix}</span>}
      </div>
    </label>
  );
}

export function RatesEditor({ rates, onChange }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Defaults are rest-of-UK (England/Wales/NI) rates. Thresholds are frozen by government policy until April
        2028, so future years default to the same figures - edit them here once HMRC/the Budget confirms actual
        rates for a given year.
      </p>

      <section>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Personal allowance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Personal allowance" value={rates.personalAllowance} onChange={(v) => onChange({ personalAllowance: v })} suffix="£/yr" />
          <Field label="Taper threshold" value={rates.paTaperThreshold} onChange={(v) => onChange({ paTaperThreshold: v })} suffix="£/yr" />
          <Field label="Taper rate" value={rates.paTaperRate} onChange={(v) => onChange({ paTaperRate: v })} suffix="£ lost per £1 over" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Income tax bands</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Basic rate band width" value={rates.basicRateBandWidth} onChange={(v) => onChange({ basicRateBandWidth: v })} suffix="£" />
          <Field label="Additional rate threshold" value={rates.additionalRateThreshold} onChange={(v) => onChange({ additionalRateThreshold: v })} suffix="£ total income" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Field label="Basic rate" value={rates.nonDividendRates.basic} onChange={(v) => onChange({ nonDividendRates: { ...rates.nonDividendRates, basic: v } })} suffix="decimal" />
          <Field label="Higher rate" value={rates.nonDividendRates.higher} onChange={(v) => onChange({ nonDividendRates: { ...rates.nonDividendRates, higher: v } })} suffix="decimal" />
          <Field label="Additional rate" value={rates.nonDividendRates.additional} onChange={(v) => onChange({ nonDividendRates: { ...rates.nonDividendRates, additional: v } })} suffix="decimal" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Dividend tax</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Dividend allowance" value={rates.dividendAllowance} onChange={(v) => onChange({ dividendAllowance: v })} suffix="£/yr" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Field label="Basic rate" value={rates.dividendRates.basic} onChange={(v) => onChange({ dividendRates: { ...rates.dividendRates, basic: v } })} suffix="decimal" />
          <Field label="Higher rate" value={rates.dividendRates.higher} onChange={(v) => onChange({ dividendRates: { ...rates.dividendRates, higher: v } })} suffix="decimal" />
          <Field label="Additional rate" value={rates.dividendRates.additional} onChange={(v) => onChange({ dividendRates: { ...rates.dividendRates, additional: v } })} suffix="decimal" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Payments on account</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Threshold" value={rates.poaThreshold} onChange={(v) => onChange({ poaThreshold: v })} suffix="£" />
          <Field
            label="Min. fraction collected at source to skip POA"
            value={rates.poaSourceCollectionFraction}
            onChange={(v) => onChange({ poaSourceCollectionFraction: v })}
            suffix="decimal"
          />
        </div>
      </section>
    </div>
  );
}
