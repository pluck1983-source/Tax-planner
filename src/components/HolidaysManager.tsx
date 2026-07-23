import { useState } from 'react';
import { formatDate } from '../lib/format';
import type { Child, Holiday } from '../lib/types';
import { Card, SelectField, SmallButton, TextField } from './ui';

interface Props {
  holidays: Holiday[];
  childRecords: Child[];
  onAdd: (holiday: Omit<Holiday, 'id'>) => void;
  onDelete: (id: string) => void;
}

function childName(childRecords: Child[], id: string): string {
  const c = childRecords.find((c) => c.id === id);
  return c ? `${c.firstName} ${c.lastName}` : 'Unknown child';
}

function AddHolidayForm({ childRecords, onAdd }: { childRecords: Child[]; onAdd: (h: Omit<Holiday, 'id'>) => void }) {
  const [ownerType, setOwnerType] = useState<'childminder' | 'client'>('childminder');
  const [childId, setChildId] = useState(childRecords[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!startDate || !endDate) return;
        if (ownerType === 'client' && !childId) return;
        onAdd({
          owner: ownerType === 'childminder' ? { type: 'childminder' } : { type: 'client', childId },
          startDate,
          endDate,
          label: label.trim() || (ownerType === 'childminder' ? 'Childminder closed' : 'Holiday'),
        });
        setLabel('');
        setStartDate('');
        setEndDate('');
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <SelectField
          label="Whose holiday"
          value={ownerType}
          onChange={setOwnerType}
          options={[
            { value: 'childminder', label: 'Childminder (closed)' },
            { value: 'client', label: 'A specific child' },
          ]}
        />
        {ownerType === 'client' && (
          <SelectField label="Child" value={childId} onChange={setChildId} options={childRecords.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />
        )}
        <TextField label="Label" value={label} onChange={setLabel} placeholder="e.g. Summer holiday" />
        <TextField label="Start date" type="date" value={startDate} onChange={setStartDate} />
        <TextField label="End date" type="date" value={endDate} onChange={setEndDate} />
      </div>
      <SmallButton type="submit" variant="primary">
        Add holiday
      </SmallButton>
    </form>
  );
}

export function HolidaysManager({ holidays, childRecords, onAdd, onDelete }: Props) {
  const childminderHolidays = holidays.filter((h) => h.owner.type === 'childminder').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const clientHolidays = holidays.filter((h) => h.owner.type === 'client').sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        During any holiday - the childminder's own, or a specific child's - non-funded hours are billed at half rate
        as a retainer, and no funded hours are claimed for that week since the child isn't attending. Weeks outside
        a holiday are billed as normal.
      </p>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Childminder holidays</h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {childminderHolidays.map((h) => (
            <li key={h.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{h.label}</span>{' '}
                <span className="text-xs text-slate-400">
                  {formatDate(h.startDate)} - {formatDate(h.endDate)}
                </span>
              </span>
              <button type="button" onClick={() => onDelete(h.id)} className="text-xs text-rose-500 hover:underline shrink-0">
                Remove
              </button>
            </li>
          ))}
          {childminderHolidays.length === 0 && <p className="text-xs text-slate-400 py-2">None added yet.</p>}
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Client (child) holidays</h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {clientHolidays.map((h) => (
            <li key={h.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{h.owner.type === 'client' ? childName(childRecords, h.owner.childId) : ''}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">{h.label}</span>{' '}
                <span className="text-xs text-slate-400">
                  {formatDate(h.startDate)} - {formatDate(h.endDate)}
                </span>
              </span>
              <button type="button" onClick={() => onDelete(h.id)} className="text-xs text-rose-500 hover:underline shrink-0">
                Remove
              </button>
            </li>
          ))}
          {clientHolidays.length === 0 && <p className="text-xs text-slate-400 py-2">None added yet.</p>}
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Add a holiday</h3>
        {childRecords.length === 0 && <p className="text-xs text-slate-400 mb-2">Add children first to log a client holiday - a childminder holiday can still be added now.</p>}
        <AddHolidayForm childRecords={childRecords} onAdd={onAdd} />
      </Card>
    </div>
  );
}
