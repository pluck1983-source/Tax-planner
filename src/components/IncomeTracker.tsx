import { useMemo, useState } from 'react';
import { formatDate, formatGBP } from '../lib/format';
import { taxYearStartForDate } from '../lib/taxEngine';
import type { Child, ChildminderState, FundingPaymentRecord, ParentPaymentRecord } from '../lib/types';
import { Card, NumberField, SelectField, SmallButton, TextField } from './ui';

interface Props {
  state: ChildminderState;
  onAddFunding: (record: Omit<FundingPaymentRecord, 'id'>) => void;
  onDeleteFunding: (id: string) => void;
  onAddParent: (record: Omit<ParentPaymentRecord, 'id'>) => void;
  onDeleteParent: (id: string) => void;
}

function childName(children: Child[], id: string): string {
  const c = children.find((c) => c.id === id);
  return c ? `${c.firstName} ${c.lastName}` : 'Unknown child';
}

const PAYMENT_METHODS = ['Bank transfer', 'Cash', 'Childcare vouchers/Tax-Free Childcare', 'Other'];

function AddFundingForm({ state, onAdd }: { state: ChildminderState; onAdd: (r: Omit<FundingPaymentRecord, 'id'>) => void }) {
  const [localAuthorityId, setLocalAuthorityId] = useState(state.localAuthorities[0]?.id ?? '');
  const [termId, setTermId] = useState<string>('none');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  if (state.localAuthorities.length === 0) return <p className="text-xs text-slate-400">Add a local authority first.</p>;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!localAuthorityId || amount <= 0) return;
        onAdd({ localAuthorityId, termId: termId === 'none' ? null : termId, amount, date, notes: notes.trim() });
        setAmount(0);
        setNotes('');
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
        <SelectField
          label="Local authority"
          value={localAuthorityId}
          onChange={setLocalAuthorityId}
          options={state.localAuthorities.map((l) => ({ value: l.id, label: l.name }))}
        />
        <SelectField
          label="Term"
          value={termId}
          onChange={setTermId}
          options={[{ value: 'none', label: 'Not linked' }, ...state.terms.map((t) => ({ value: t.id, label: t.label }))]}
        />
        <NumberField label="Amount received" value={amount} onChange={setAmount} suffix="£" min={0} />
        <TextField label="Date received" type="date" value={date} onChange={setDate} />
      </div>
      <TextField label="Notes" value={notes} onChange={setNotes} placeholder="Optional" />
      <SmallButton type="submit" variant="primary">
        Log funding payment
      </SmallButton>
    </form>
  );
}

function AddParentForm({ childRecords, onAdd }: { childRecords: Child[]; onAdd: (r: Omit<ParentPaymentRecord, 'id'>) => void }) {
  const [childId, setChildId] = useState(childRecords[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  if (childRecords.length === 0) return <p className="text-xs text-slate-400">Add a child first.</p>;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!childId || amount <= 0) return;
        onAdd({ childId, amount, date, method, notes: notes.trim() });
        setAmount(0);
        setNotes('');
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
        <SelectField label="Child" value={childId} onChange={setChildId} options={childRecords.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />
        <NumberField label="Amount received" value={amount} onChange={setAmount} suffix="£" min={0} />
        <TextField label="Date received" type="date" value={date} onChange={setDate} />
        <SelectField label="Method" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
      </div>
      <TextField label="Notes" value={notes} onChange={setNotes} placeholder="Optional" />
      <SmallButton type="submit" variant="primary">
        Log parent payment
      </SmallButton>
    </form>
  );
}

export function IncomeTracker({ state, onAddFunding, onDeleteFunding, onAddParent, onDeleteParent }: Props) {
  const taxYearStart = taxYearStartForDate(new Date());
  const taxYearStartDate = `${taxYearStart}-04-06`;
  const taxYearEndDate = `${taxYearStart + 1}-04-05`;

  const fundingThisYear = useMemo(
    () => state.fundingPaymentsReceived.filter((r) => r.date >= taxYearStartDate && r.date <= taxYearEndDate),
    [state.fundingPaymentsReceived, taxYearStartDate, taxYearEndDate],
  );
  const parentThisYear = useMemo(
    () => state.parentPaymentsReceived.filter((r) => r.date >= taxYearStartDate && r.date <= taxYearEndDate),
    [state.parentPaymentsReceived, taxYearStartDate, taxYearEndDate],
  );
  const fundingTotal = fundingThisYear.reduce((s, r) => s + r.amount, 0);
  const parentTotal = parentThisYear.reduce((s, r) => s + r.amount, 0);

  const sortedFunding = [...state.fundingPaymentsReceived].sort((a, b) => b.date.localeCompare(a.date));
  const sortedParent = [...state.parentPaymentsReceived].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Log actual income as it's received - separate from the Forecast tab's projections. This feeds the Tax tab's
        "confirmed" liability figures.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-slate-400">Received this tax year</p>
          <p className="text-2xl font-semibold mt-1">{formatGBP(fundingTotal + parentTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{taxYearStart}/{String((taxYearStart + 1) % 100).padStart(2, '0')} tax year</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Funding received</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatGBP(fundingTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Parent payments received</p>
          <p className="text-2xl font-semibold mt-1 text-indigo-600 dark:text-indigo-400">{formatGBP(parentTotal)}</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Funding payments received</h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-4">
          {sortedFunding.map((r) => {
            const la = state.localAuthorities.find((l) => l.id === r.localAuthorityId);
            const term = r.termId ? state.terms.find((t) => t.id === r.termId) : null;
            return (
              <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm flex-wrap">
                <span>
                  <span className="font-medium">{formatDate(r.date)}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    {la?.name ?? 'Unknown council'}
                    {term ? ` - ${term.label}` : ''}
                  </span>
                  {r.notes && <span className="text-xs text-slate-400"> - {r.notes}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{formatGBP(r.amount)}</span>
                  <button type="button" onClick={() => onDeleteFunding(r.id)} className="text-xs text-rose-500 hover:underline">
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
          {sortedFunding.length === 0 && <p className="text-xs text-slate-400 py-2">No funding payments logged yet.</p>}
        </ul>
        <AddFundingForm state={state} onAdd={onAddFunding} />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Parent payments received</h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-4">
          {sortedParent.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm flex-wrap">
              <span>
                <span className="font-medium">{formatDate(r.date)}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  {childName(state.children, r.childId)} - {r.method}
                </span>
                {r.notes && <span className="text-xs text-slate-400"> - {r.notes}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{formatGBP(r.amount)}</span>
                <button type="button" onClick={() => onDeleteParent(r.id)} className="text-xs text-rose-500 hover:underline">
                  Remove
                </button>
              </span>
            </li>
          ))}
          {sortedParent.length === 0 && <p className="text-xs text-slate-400 py-2">No parent payments logged yet.</p>}
        </ul>
        <AddParentForm childRecords={state.children} onAdd={onAddParent} />
      </Card>
    </div>
  );
}
