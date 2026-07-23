import { useState } from 'react';
import { FUNDING_TYPE_LABELS } from '../lib/fundingEngine';
import { formatDate, formatGBPPrecise } from '../lib/format';
import type { AgeBand, FundingPaymentSchedule, FundingRate, FundingType, LocalAuthority } from '../lib/types';
import { Card, NumberField, SelectField, SmallButton, TextField } from './ui';

interface Props {
  localAuthorities: LocalAuthority[];
  ageBands: AgeBand[];
  onAdd: (la: { name: string }) => void;
  onUpdate: (id: string, patch: Partial<Omit<LocalAuthority, 'fundingRates'>>) => void;
  onDelete: (id: string) => void;
  onAddRate: (localAuthorityId: string, rate: Omit<FundingRate, 'id'>) => void;
  onDeleteRate: (localAuthorityId: string, id: string) => void;
}

const PAYMENT_SCHEDULE_OPTIONS: { value: FundingPaymentSchedule; label: string }[] = [
  { value: 'termly', label: 'Termly - 3 lump sums a year' },
  { value: 'monthly', label: 'Monthly - spread across the term' },
];

const FUNDING_TYPES: FundingType[] = ['universal15', 'extended30'];

function AddRateForm({
  ageBands,
  onAdd,
}: {
  ageBands: AgeBand[];
  onAdd: (rate: Omit<FundingRate, 'id'>) => void;
}) {
  const [ageBandId, setAgeBandId] = useState(ageBands[0]?.id ?? '');
  const [fundingType, setFundingType] = useState<FundingType>('universal15');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  if (ageBands.length === 0) return <p className="text-xs text-slate-400">Add an age band first.</p>;

  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ ageBandId, fundingType, hourlyRate, effectiveFrom });
      }}
    >
      <SelectField
        label="Age band"
        value={ageBandId}
        onChange={setAgeBandId}
        options={ageBands.map((b) => ({ value: b.id, label: b.label }))}
      />
      <SelectField
        label="Funding type"
        value={fundingType}
        onChange={setFundingType}
        options={FUNDING_TYPES.map((t) => ({ value: t, label: FUNDING_TYPE_LABELS[t] }))}
      />
      <NumberField label="Hourly rate" value={hourlyRate} onChange={setHourlyRate} suffix="£/hr" min={0} />
      <TextField label="Effective from" type="date" value={effectiveFrom} onChange={setEffectiveFrom} />
      <div className="col-span-2 sm:col-span-4">
        <SmallButton type="submit" variant="primary">
          Add rate
        </SmallButton>
      </div>
    </form>
  );
}

function RateHistory({
  ageBands,
  rates,
  onDelete,
}: {
  ageBands: AgeBand[];
  rates: FundingRate[];
  onDelete: (id: string) => void;
}) {
  if (rates.length === 0) return <p className="text-xs text-slate-400">No funding rates set yet.</p>;

  const grouped = new Map<string, FundingRate[]>();
  for (const r of rates) {
    const key = `${r.ageBandId}|${r.fundingType}`;
    grouped.set(key, [...(grouped.get(key) ?? []), r]);
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([key, group]) => {
        const [ageBandId, fundingType] = key.split('|') as [string, FundingType];
        const band = ageBands.find((b) => b.id === ageBandId);
        const sorted = [...group].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
        return (
          <div key={key}>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              {band?.label ?? 'Unknown band'} - {FUNDING_TYPE_LABELS[fundingType]}
            </p>
            <ul className="text-sm space-y-1">
              {sorted.map((r, i) => (
                <li key={r.id} className="flex items-center gap-2">
                  <span className={i === 0 ? 'font-medium' : 'text-slate-400'}>{formatGBPPrecise(r.hourlyRate)}/hr</span>
                  <span className="text-xs text-slate-400">from {formatDate(r.effectiveFrom)}</span>
                  {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">current</span>}
                  <button type="button" onClick={() => onDelete(r.id)} className="text-xs text-rose-500 hover:underline ml-auto">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function LocalAuthorityManager({ localAuthorities, ageBands, onAdd, onUpdate, onDelete, onAddRate, onDeleteRate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(localAuthorities[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const selected = localAuthorities.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-56 shrink-0 space-y-2">
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            onAdd({ name: newName.trim() });
            setNewName('');
          }}
        >
          <input
            className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
            placeholder="New local authority"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <SmallButton type="submit" variant="primary">
            Add
          </SmallButton>
        </form>
        <nav className="flex flex-col gap-1">
          {localAuthorities.map((la) => (
            <button
              key={la.id}
              type="button"
              onClick={() => setSelectedId(la.id)}
              className={`text-left px-3 py-2 rounded-lg border text-sm whitespace-nowrap ${
                selectedId === la.id
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              {la.name}
            </button>
          ))}
          {localAuthorities.length === 0 && <p className="text-xs text-slate-400 px-1">No local authorities yet.</p>}
        </nav>
      </div>

      <div className="flex-1 min-w-0">
        {!selected && <p className="text-slate-400 text-sm">Add or select a local authority to set its funding rates.</p>}
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <TextField label="Name" value={selected.name} onChange={(v) => onUpdate(selected.id, { name: v })} />
              <SmallButton
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Remove ${selected.name}? Its funding rates will be lost.`)) {
                    onDelete(selected.id);
                    setSelectedId(null);
                  }
                }}
              >
                Remove
              </SmallButton>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Contact notes</span>
              <textarea
                className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
                rows={2}
                value={selected.contactNotes}
                onChange={(e) => onUpdate(selected.id, { contactNotes: e.target.value })}
              />
            </label>

            <Card>
              <h3 className="text-sm font-semibold mb-1">How this council pays funding</h3>
              <p className="text-xs text-slate-400 mb-3 max-w-2xl">
                Free early education funding is normally paid to providers termly, in arrears, once the council has
                processed that term's headcount return - some councils instead offer to spread it into monthly
                instalments. Check which applies with this council so the forecast shows realistic payment dates,
                not just when the hours are delivered.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  label="Payment schedule"
                  value={selected.fundingPaymentSchedule}
                  onChange={(v) => onUpdate(selected.id, { fundingPaymentSchedule: v })}
                  options={PAYMENT_SCHEDULE_OPTIONS}
                />
                {selected.fundingPaymentSchedule === 'termly' && (
                  <NumberField
                    label="Payment lag after term starts"
                    value={selected.termlyPaymentLagWeeks}
                    onChange={(v) => onUpdate(selected.id, { termlyPaymentLagWeeks: v })}
                    suffix="weeks"
                    min={0}
                  />
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold mb-3">Funding rates</h3>
              <RateHistory ageBands={ageBands} rates={selected.fundingRates} onDelete={(id) => onDeleteRate(selected.id, id)} />
            </Card>

            <Card>
              <h3 className="text-sm font-semibold mb-3">Add a rate</h3>
              <AddRateForm ageBands={ageBands} onAdd={(rate) => onAddRate(selected.id, rate)} />
              <p className="text-xs text-slate-400 mt-3">
                Add a new rate with a future effective date ahead of a known increase - the forecast automatically
                switches to it once that date arrives, keeping the current rate for weeks before it.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
