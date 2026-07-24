import { useMemo, useState } from 'react';
import { computeForecast, computeFundingPayments } from '../lib/forecastEngine';
import type { WeekChildBreakdown, WeekForecast } from '../lib/forecastEngine';
import { addDays, formatWeekLabel, toISODate } from '../lib/dateUtils';
import { formatGBP, formatGBPPrecise, formatHours, formatDate } from '../lib/format';
import type { ChildminderState } from '../lib/types';
import { Card, SelectField } from './ui';
import { ForecastChart } from './ForecastChart';

interface Props {
  state: ChildminderState;
}

type ViewMode = 'total' | 'perChild';

const WEEK_OPTIONS = [4, 8, 12, 26, 52];

function aggregateWeek(breakdowns: WeekChildBreakdown[]) {
  return breakdowns.reduce(
    (acc, b) => ({
      scheduledHours: acc.scheduledHours + b.scheduledHours,
      fundedHours: acc.fundedHours + b.fundedHours,
      fundedAmount: acc.fundedAmount + b.fundedAmount,
      nonFundedHours: acc.nonFundedHours + b.nonFundedHours,
      nonFundedAmount: acc.nonFundedAmount + b.nonFundedAmount,
      isTermWeek: acc.isTermWeek || b.isTermWeek,
      onHoliday: acc.onHoliday || b.onHoliday,
      missingRate: acc.missingRate || b.missingRate,
    }),
    { scheduledHours: 0, fundedHours: 0, fundedAmount: 0, nonFundedHours: 0, nonFundedAmount: 0, isTermWeek: false, onHoliday: false, missingRate: false },
  );
}

function WeeklyTable({ weeks, breakdownFor }: { weeks: WeekForecast[]; breakdownFor: (w: WeekForecast) => WeekChildBreakdown[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <th className="py-2 pr-3 font-medium">Week</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium text-right">Scheduled</th>
            <th className="py-2 pr-3 font-medium text-right">Funded hrs</th>
            <th className="py-2 pr-3 font-medium text-right">Funding £</th>
            <th className="py-2 pr-3 font-medium text-right">Parental hrs</th>
            <th className="py-2 pr-3 font-medium text-right">Parental £</th>
            <th className="py-2 pr-3 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const agg = aggregateWeek(breakdownFor(w));
            return (
              <tr key={w.weekStart.toISOString()} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="py-2 pr-3 whitespace-nowrap">{formatWeekLabel(w.weekStart)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {agg.onHoliday && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 mr-1">
                      Holiday
                    </span>
                  )}
                  {!agg.isTermWeek && !agg.onHoliday && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Non-term
                    </span>
                  )}
                  {agg.isTermWeek && !agg.onHoliday && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      Term
                    </span>
                  )}
                  {agg.missingRate && <span className="text-xs text-rose-500 ml-1" title="A rate is missing for this week - figures are incomplete">⚠</span>}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatHours(agg.scheduledHours)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatHours(agg.fundedHours)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatGBP(agg.fundedAmount)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatHours(agg.nonFundedHours)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatGBP(agg.nonFundedAmount)}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatGBP(agg.fundedAmount + agg.nonFundedAmount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ForecastView({ state }: Props) {
  const [weeksAhead, setWeeksAhead] = useState(12);
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(state.children[0]?.id ?? null);

  const weeks = useMemo(() => computeForecast(state, new Date(), weeksAhead), [state, weeksAhead]);
  const fundingPayments = useMemo(() => computeFundingPayments(state), [state]);

  const totals = useMemo(() => {
    let parental = 0;
    let funding = 0;
    let missing = 0;
    for (const w of weeks) {
      for (const b of w.breakdowns) {
        parental += b.nonFundedAmount;
        funding += b.fundedAmount;
        if (b.missingRate) missing += 1;
      }
    }
    return { parental, funding, missing };
  }, [weeks]);

  const perChildTotals = useMemo(() => {
    const byChild = new Map<string, { parental: number; funding: number; hours: number }>();
    for (const w of weeks) {
      for (const b of w.breakdowns) {
        const entry = byChild.get(b.childId) ?? { parental: 0, funding: 0, hours: 0 };
        entry.parental += b.nonFundedAmount;
        entry.funding += b.fundedAmount;
        entry.hours += b.scheduledHours;
        byChild.set(b.childId, entry);
      }
    }
    return state.children
      .map((c) => ({ child: c, ...(byChild.get(c.id) ?? { parental: 0, funding: 0, hours: 0 }) }))
      .filter((row) => row.hours > 0 || row.child.active);
  }, [weeks, state.children]);

  const today = toISODate(new Date());
  const horizonEndIso = weeks.length ? toISODate(addDays(weeks[weeks.length - 1].weekStart, 6)) : today;
  const upcomingPayments = fundingPayments.filter((p) => p.paymentDate >= today && p.paymentDate <= horizonEndIso);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <SelectField
            label="Forecast horizon"
            value={String(weeksAhead)}
            onChange={(v) => setWeeksAhead(Number(v))}
            options={WEEK_OPTIONS.map((w) => ({ value: String(w), label: `${w} weeks ahead` }))}
          />
        </div>
        <div className="w-48">
          <SelectField
            label="View"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'total', label: 'Total (all children)' },
              { value: 'perChild', label: 'Per child' },
            ]}
          />
        </div>
        {viewMode === 'perChild' && state.children.length > 0 && (
          <div className="w-48">
            <SelectField
              label="Child"
              value={selectedChildId ?? ''}
              onChange={setSelectedChildId}
              options={state.children.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
            />
          </div>
        )}
      </div>

      {totals.missing > 0 && (
        <div className="text-xs px-3 py-2 rounded border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
          {totals.missing} week/child combination{totals.missing === 1 ? '' : 's'} could not be fully priced - a funding or
          non-funded rate is missing for the age band/date involved. Check the Local Authorities and Rates tabs.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-slate-400">Total forecast income</p>
          <p className="text-2xl font-semibold mt-1">{formatGBP(totals.parental + totals.funding)}</p>
          <p className="text-xs text-slate-400 mt-1">over {weeksAhead} weeks</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Parental (non-funded) income</p>
          <p className="text-2xl font-semibold mt-1 text-indigo-600 dark:text-indigo-400">{formatGBP(totals.parental)}</p>
          <p className="text-xs text-slate-400 mt-1">paid directly by parents</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Funding (LA-paid) income</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatGBP(totals.funding)}</p>
          <p className="text-xs text-slate-400 mt-1">accrued from delivered funded hours</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Weekly income</h3>
        <ForecastChart weeks={weeks} />
      </Card>

      {viewMode === 'total' && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Weekly breakdown - all children</h3>
          <WeeklyTable weeks={weeks} breakdownFor={(w) => w.breakdowns} />
        </Card>
      )}

      {viewMode === 'perChild' && (
        <>
          <Card>
            <h3 className="text-sm font-semibold mb-3">Totals per child - {weeksAhead} week horizon</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3 font-medium">Child</th>
                    <th className="py-2 pr-3 font-medium text-right">Weekly hrs</th>
                    <th className="py-2 pr-3 font-medium text-right">Funding £</th>
                    <th className="py-2 pr-3 font-medium text-right">Parental £</th>
                    <th className="py-2 pr-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {perChildTotals.map((row) => (
                    <tr key={row.child.id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2 pr-3">
                        {row.child.firstName} {row.child.lastName}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatHours(row.hours / Math.max(1, weeksAhead))}/wk</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatGBP(row.funding)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatGBP(row.parental)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatGBP(row.funding + row.parental)}</td>
                    </tr>
                  ))}
                  {perChildTotals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-xs text-slate-400">
                        No children yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {selectedChildId && (
            <Card>
              <h3 className="text-sm font-semibold mb-3">Weekly breakdown - {state.children.find((c) => c.id === selectedChildId)?.firstName}</h3>
              <WeeklyTable weeks={weeks} breakdownFor={(w) => w.breakdowns.filter((b) => b.childId === selectedChildId)} />
            </Card>
          )}
        </>
      )}

      <Card>
        <h3 className="text-sm font-semibold mb-1">Funding payments - when the money actually lands</h3>
        <p className="text-xs text-slate-400 mb-3 max-w-2xl">
          Local authorities pay funded-hours income separately from when hours are delivered - either as one lump sum
          per term (in arrears, after headcount) or spread across monthly instalments, set per local authority.
        </p>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {upcomingPayments.map((p, i) => (
            <li key={`${p.localAuthorityId}-${p.term.id}-${i}`} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{formatDate(p.paymentDate)}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  {p.localAuthorityName} - {p.term.label}
                </span>
              </span>
              <span className="font-medium tabular-nums">{formatGBPPrecise(p.amount)}</span>
            </li>
          ))}
          {upcomingPayments.length === 0 && <p className="text-xs text-slate-400 py-2">No funding payments due within this horizon yet - add terms and assign children to a local authority.</p>}
        </ul>
      </Card>
    </div>
  );
}
