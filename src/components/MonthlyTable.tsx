import type { TaxYearData } from '../lib/types';
import { MONTH_LABELS } from '../lib/types';
import { estimatePayeTax } from '../lib/taxEngine';

interface Props {
  year: TaxYearData;
  onUpdateMonth: (monthIndex: number, patch: Partial<TaxYearData['months'][number]>) => void;
}

function NumberCell({
  value,
  onChange,
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  title?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className="w-20 px-2 py-1 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
      value={value === 0 ? '' : value}
      placeholder="0"
      title={title}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

export function MonthlyTable({ year, onUpdateMonth }: Props) {
  const months = [...year.months].sort((a, b) => a.monthIndex - b.monthIndex);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-slate-400 text-xs">
            <th></th>
            <th className="pb-1 px-2 font-medium text-center" colSpan={3}>
              Income
            </th>
            <th className="pb-1 px-2 font-medium text-center" colSpan={2}>
              Reliefs (net paid)
            </th>
            <th className="pb-1 px-2 font-medium text-center" colSpan={2}>
              Gains &amp; savings
            </th>
            <th></th>
          </tr>
          <tr className="text-left text-slate-500 dark:text-slate-400">
            <th className="py-2 pr-2 font-medium">Month</th>
            <th className="py-2 px-2 font-medium text-right">Salary (PAYE)</th>
            <th className="py-2 px-2 font-medium text-right">PAYE tax deducted</th>
            <th className="py-2 px-2 font-medium text-right">Dividends</th>
            <th className="py-2 px-2 font-medium text-right">Other income</th>
            <th className="py-2 px-2 font-medium text-right">Pension</th>
            <th className="py-2 px-2 font-medium text-right">Gift Aid</th>
            <th className="py-2 px-2 font-medium text-right">Capital gains</th>
            <th className="py-2 px-2 font-medium text-right">Saved this month</th>
            <th className="py-2 pl-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const estimatedPaye = estimatePayeTax(year.rates, m.paye);
            return (
              <tr key={m.monthIndex} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-2 font-medium text-slate-700 dark:text-slate-200">
                  {MONTH_LABELS[m.monthIndex]}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell value={m.paye} onChange={(v) => onUpdateMonth(m.monthIndex, { paye: v })} />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-20 px-2 py-1 rounded border border-slate-200 bg-white text-right tabular-nums dark:bg-slate-800 dark:border-slate-700"
                    value={m.payeTaxDeducted ?? ''}
                    placeholder={estimatedPaye ? String(Math.round(estimatedPaye)) : '0'}
                    onChange={(e) =>
                      onUpdateMonth(m.monthIndex, {
                        payeTaxDeducted: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    title="Leave blank to auto-estimate from salary using a standard tax code"
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell value={m.dividends} onChange={(v) => onUpdateMonth(m.monthIndex, { dividends: v })} />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell
                    value={m.otherIncome}
                    onChange={(v) => onUpdateMonth(m.monthIndex, { otherIncome: v })}
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell
                    value={m.pensionContribution}
                    onChange={(v) => onUpdateMonth(m.monthIndex, { pensionContribution: v })}
                    title="Net amount paid into a personal (relief-at-source) pension, e.g. a SIPP - not workplace contributions taken from gross pay"
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell
                    value={m.giftAid}
                    onChange={(v) => onUpdateMonth(m.monthIndex, { giftAid: v })}
                    title="Net Gift Aid donations made this month"
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell
                    value={m.capitalGains}
                    onChange={(v) => onUpdateMonth(m.monthIndex, { capitalGains: v })}
                    title="Net chargeable gains realised this month, before the annual exempt amount"
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <NumberCell
                    value={m.savedThisMonth}
                    onChange={(v) => onUpdateMonth(m.monthIndex, { savedThisMonth: v })}
                  />
                </td>
                <td className="py-1.5 pl-2">
                  <input
                    type="text"
                    className="w-full min-w-[8rem] px-2 py-1 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
                    value={m.notes}
                    onChange={(e) => onUpdateMonth(m.monthIndex, { notes: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="text-xs text-slate-400 mt-2 space-y-1">
        <li>
          Leave "PAYE tax deducted" blank to auto-estimate it from salary at a standard tax code (shown as the
          placeholder) - enter the actual figure from your payslip for accuracy.
        </li>
        <li>
          "Pension" is for personal relief-at-source contributions (e.g. a SIPP) paid from your own money - if
          your salary already has workplace pension contributions taken off before tax (salary sacrifice/net
          pay), enter your salary after that deduction and leave this blank.
        </li>
        <li>"Gift Aid" and "Pension" should both be the net amount you actually paid - they're grossed up automatically.</li>
      </ul>
    </div>
  );
}
