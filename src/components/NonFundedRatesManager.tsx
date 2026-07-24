import { useState } from 'react';
import { formatDate, formatGBPPrecise } from '../lib/format';
import type { AgeBand, ChildminderRates, LatePickupChargeType, LatePickupRate, NonFundedRate } from '../lib/types';
import { Card, NumberField, SelectField, SmallButton, TextField } from './ui';

interface Props {
  rates: ChildminderRates;
  ageBands: AgeBand[];
  onAddNonFunded: (rate: Omit<NonFundedRate, 'id'>) => void;
  onDeleteNonFunded: (id: string) => void;
  onAddLatePickup: (rate: Omit<LatePickupRate, 'id'>) => void;
  onDeleteLatePickup: (id: string) => void;
}

const CHARGE_TYPE_LABELS: Record<LatePickupChargeType, string> = {
  flat: 'Flat fee',
  perHour: 'Per hour (or part)',
  per15Min: 'Per 15 minutes (or part)',
};

function AddNonFundedForm({ ageBands, onAdd }: { ageBands: AgeBand[]; onAdd: (rate: Omit<NonFundedRate, 'id'>) => void }) {
  const [ageBandId, setAgeBandId] = useState<string>('all');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ ageBandId: ageBandId === 'all' ? null : ageBandId, hourlyRate, effectiveFrom });
      }}
    >
      <SelectField
        label="Applies to"
        value={ageBandId}
        onChange={setAgeBandId}
        options={[{ value: 'all', label: 'All ages (default)' }, ...ageBands.map((b) => ({ value: b.id, label: b.label }))]}
      />
      <NumberField label="Hourly rate" value={hourlyRate} onChange={setHourlyRate} suffix="£/hr" min={0} />
      <TextField label="Effective from" type="date" value={effectiveFrom} onChange={setEffectiveFrom} />
      <div>
        <SmallButton type="submit" variant="primary">
          Add rate
        </SmallButton>
      </div>
    </form>
  );
}

function AddLatePickupForm({ onAdd }: { onAdd: (rate: Omit<LatePickupRate, 'id'>) => void }) {
  const [chargeType, setChargeType] = useState<LatePickupChargeType>('flat');
  const [amount, setAmount] = useState(0);
  const [graceMinutes, setGraceMinutes] = useState(10);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ chargeType, amount, graceMinutes, effectiveFrom });
      }}
    >
      <SelectField
        label="Charge type"
        value={chargeType}
        onChange={setChargeType}
        options={(Object.keys(CHARGE_TYPE_LABELS) as LatePickupChargeType[]).map((t) => ({ value: t, label: CHARGE_TYPE_LABELS[t] }))}
      />
      <NumberField label="Amount" value={amount} onChange={setAmount} suffix="£" min={0} />
      <NumberField label="Grace period" value={graceMinutes} onChange={setGraceMinutes} suffix="minutes" min={0} />
      <TextField label="Effective from" type="date" value={effectiveFrom} onChange={setEffectiveFrom} />
      <div>
        <SmallButton type="submit" variant="primary">
          Add rate
        </SmallButton>
      </div>
    </form>
  );
}

export function NonFundedRatesManager({ rates, ageBands, onAddNonFunded, onDeleteNonFunded, onAddLatePickup, onDeleteLatePickup }: Props) {
  const sortedNonFunded = [...rates.nonFundedRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const sortedLate = [...rates.latePickupRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-sm font-semibold mb-1">Non-funded hourly rates</h3>
        <p className="text-xs text-slate-400 mb-3 max-w-2xl">
          Your own private rate, charged for any hours not covered by funded 15/30-hour entitlement (or for children
          not registered for funding at all). Set an age-specific rate to override the default for that band.
        </p>
        {sortedNonFunded.length === 0 && <p className="text-xs text-slate-400 mb-3">No rates set yet.</p>}
        <ul className="text-sm space-y-1 mb-4">
          {sortedNonFunded.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="font-medium">{formatGBPPrecise(r.hourlyRate)}/hr</span>
              <span className="text-xs text-slate-400">
                {r.ageBandId ? (ageBands.find((b) => b.id === r.ageBandId)?.label ?? 'Unknown band') : 'All ages'}
              </span>
              <span className="text-xs text-slate-400">from {formatDate(r.effectiveFrom)}</span>
              <button type="button" onClick={() => onDeleteNonFunded(r.id)} className="text-xs text-rose-500 hover:underline ml-auto">
                Remove
              </button>
            </li>
          ))}
        </ul>
        <AddNonFundedForm ageBands={ageBands} onAdd={onAddNonFunded} />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-1">Late pickup rate</h3>
        <p className="text-xs text-slate-400 mb-3 max-w-2xl">
          Charged when a child is collected after their scheduled end time, once the grace period has passed. Shown
          automatically against attendance records where a late pickup was logged.
        </p>
        {sortedLate.length === 0 && <p className="text-xs text-slate-400 mb-3">No late pickup rate set yet.</p>}
        <ul className="text-sm space-y-1 mb-4">
          {sortedLate.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="font-medium">
                {formatGBPPrecise(r.amount)} {CHARGE_TYPE_LABELS[r.chargeType].toLowerCase()}
              </span>
              <span className="text-xs text-slate-400">{r.graceMinutes}min grace</span>
              <span className="text-xs text-slate-400">from {formatDate(r.effectiveFrom)}</span>
              <button type="button" onClick={() => onDeleteLatePickup(r.id)} className="text-xs text-rose-500 hover:underline ml-auto">
                Remove
              </button>
            </li>
          ))}
        </ul>
        <AddLatePickupForm onAdd={onAddLatePickup} />
      </Card>
    </div>
  );
}
