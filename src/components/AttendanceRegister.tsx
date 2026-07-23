import { useMemo, useState } from 'react';
import { parseISODate, timeToMinutes } from '../lib/dateUtils';
import { latePickupCharge, latePickupRateFor } from '../lib/fundingEngine';
import { formatDate, formatGBPPrecise } from '../lib/format';
import type { AttendanceRecord, AttendanceStatus, Child, ChildminderRates, ScheduleDay } from '../lib/types';
import { Card, SelectField, SmallButton, TextField } from './ui';

interface Props {
  attendance: AttendanceRecord[];
  childRecords: Child[];
  rates: ChildminderRates;
  onAdd: (record: Omit<AttendanceRecord, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<AttendanceRecord>) => void;
  onDelete: (id: string) => void;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  'late-arrival': 'Late arrival',
  'no-show': 'No-show',
  'absence-notified': 'Absence (notified in advance)',
  'left-early': 'Left early',
};

const SAFEGUARDING_DEFAULT: Record<AttendanceStatus, boolean> = {
  present: false,
  'late-arrival': true,
  'no-show': true,
  'absence-notified': false,
  'left-early': false,
};

function scheduleForDate(child: Child, dateIso: string): ScheduleDay | undefined {
  const dow = parseISODate(dateIso).getDay();
  return child.weeklySchedule.find((d) => d.dayOfWeek === dow);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function LogForm({ childRecords, rates, onAdd }: { childRecords: Child[]; rates: ChildminderRates; onAdd: (r: Omit<AttendanceRecord, 'id'>) => void }) {
  const [childId, setChildId] = useState(childRecords[0]?.id ?? '');
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [actualArrival, setActualArrival] = useState('');
  const [actualDeparture, setActualDeparture] = useState('');
  const [notes, setNotes] = useState('');
  const [safeguardingFlag, setSafeguardingFlag] = useState(false);

  const child = childRecords.find((c) => c.id === childId);
  const scheduled = child ? scheduleForDate(child, date) : undefined;

  function applyStatus(next: AttendanceStatus) {
    setStatus(next);
    setSafeguardingFlag(SAFEGUARDING_DEFAULT[next]);
  }

  if (childRecords.length === 0) return <p className="text-xs text-slate-400">Add a child first.</p>;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!childId || !date) return;
        onAdd({
          childId,
          date,
          plannedStart: scheduled?.startTime ?? null,
          plannedEnd: scheduled?.endTime ?? null,
          actualArrival: actualArrival || null,
          actualDeparture: actualDeparture || null,
          status,
          safeguardingFlag,
          notes: notes.trim(),
        });
        setActualArrival('');
        setActualDeparture('');
        setNotes('');
        setStatus('present');
        setSafeguardingFlag(false);
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SelectField label="Child" value={childId} onChange={setChildId} options={childRecords.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />
        <TextField label="Date" type="date" value={date} onChange={setDate} />
        <SelectField label="Status" value={status} onChange={applyStatus} options={(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        <div className="text-sm flex flex-col gap-1">
          <span className="text-slate-500 dark:text-slate-400">Scheduled</span>
          <span className="px-2 py-1.5 text-xs text-slate-400">{scheduled ? `${scheduled.startTime} - ${scheduled.endTime}` : 'Not scheduled this day'}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TextField label="Actual arrival" type="time" value={actualArrival} onChange={setActualArrival} />
        <TextField label="Actual departure" type="time" value={actualDeparture} onChange={setActualDeparture} />
      </div>
      {actualDeparture && scheduled?.endTime && (
        <LatePickupPreview rates={rates} plannedEnd={scheduled.endTime} actualDeparture={actualDeparture} date={date} />
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Notes {(status === 'late-arrival' || status === 'no-show') && '(please record details - Ofsted safeguarding expectation)'}</span>
        <textarea
          className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened, who was contacted, outcome..."
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={safeguardingFlag} onChange={(e) => setSafeguardingFlag(e.target.checked)} />
        Flag for safeguarding follow-up
      </label>
      <SmallButton type="submit" variant="primary">
        Log attendance
      </SmallButton>
    </form>
  );
}

function LatePickupPreview({
  rates,
  plannedEnd,
  actualDeparture,
  date,
}: {
  rates: ChildminderRates;
  plannedEnd: string;
  actualDeparture: string;
  date: string;
}) {
  const minutesLate = timeToMinutes(actualDeparture) - timeToMinutes(plannedEnd);
  if (minutesLate <= 0) return null;
  const rate = latePickupRateFor(rates, parseISODate(date));
  if (!rate) return <p className="text-xs text-amber-600 dark:text-amber-400">{minutesLate} minutes late - no late pickup rate configured.</p>;
  const charge = latePickupCharge(rate, minutesLate);
  if (charge <= 0) return <p className="text-xs text-slate-400">{minutesLate} minutes late - within the {rate.graceMinutes}-minute grace period.</p>;
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400">
      {minutesLate} minutes late - suggested late pickup charge {formatGBPPrecise(charge)} (for your own reference; not added to any forecast automatically).
    </p>
  );
}

function RecordRow({
  record,
  child,
  rates,
  onUpdate,
  onDelete,
  dateLabel,
}: {
  record: AttendanceRecord;
  child: Child | undefined;
  rates: ChildminderRates;
  onUpdate: (patch: Partial<AttendanceRecord>) => void;
  onDelete: () => void;
  dateLabel?: string;
}) {
  const minutesLate = record.plannedEnd && record.actualDeparture ? timeToMinutes(record.actualDeparture) - timeToMinutes(record.plannedEnd) : 0;
  const lateRate = minutesLate > 0 ? latePickupRateFor(rates, parseISODate(record.date)) : null;
  const charge = lateRate ? latePickupCharge(lateRate, minutesLate) : 0;

  return (
    <li className={`py-2.5 text-sm ${record.safeguardingFlag ? 'border-l-2 border-rose-400 pl-2 -ml-2.5' : ''}`}>
      {dateLabel && <p className="text-xs text-slate-400 mb-1">{dateLabel}</p>}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-medium">{child ? `${child.firstName} ${child.lastName}` : 'Unknown child'}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full ${
            record.status === 'present'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : record.status === 'no-show' || record.status === 'late-arrival'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {STATUS_LABELS[record.status]}
        </span>
        {record.safeguardingFlag && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-medium">
            Safeguarding flag
          </span>
        )}
        <span className="text-xs text-slate-400">
          {record.plannedStart ?? '?'}-{record.plannedEnd ?? '?'} scheduled
          {record.actualArrival && ` - arrived ${record.actualArrival}`}
          {record.actualDeparture && ` - left ${record.actualDeparture}`}
        </span>
        <button type="button" onClick={onDelete} className="text-xs text-rose-500 hover:underline ml-auto">
          Remove
        </button>
      </div>
      {charge > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {minutesLate} min late pickup - suggested charge {formatGBPPrecise(charge)}
        </p>
      )}
      {record.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap">{record.notes}</p>}
      {!record.notes && record.safeguardingFlag && (
        <label className="mt-1 flex flex-col gap-1">
          <span className="text-xs text-rose-500">No notes recorded yet - add details for the safeguarding record:</span>
          <textarea
            className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
            rows={2}
            onBlur={(e) => e.target.value.trim() && onUpdate({ notes: e.target.value.trim() })}
          />
        </label>
      )}
    </li>
  );
}

export function AttendanceRegister({ attendance, childRecords, rates, onAdd, onUpdate, onDelete }: Props) {
  const [filterDate, setFilterDate] = useState(todayIso());
  const [view, setView] = useState<'day' | 'safeguarding'>('day');

  const dayRecords = useMemo(
    () => attendance.filter((a) => a.date === filterDate).sort((a, b) => (a.plannedStart ?? '').localeCompare(b.plannedStart ?? '')),
    [attendance, filterDate],
  );
  const flagged = useMemo(() => [...attendance].filter((a) => a.safeguardingFlag).sort((a, b) => b.date.localeCompare(a.date)), [attendance]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Attendance is logged for your own records and safeguarding purposes only - fees are billed in advance from
        each child's proposed weekly schedule, not from what's registered here. Late arrivals and no-shows are
        highlighted so nothing is missed, in line with Ofsted's expectation that childminders actively follow up on
        both.
      </p>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Log attendance</h3>
        <LogForm childRecords={childRecords} rates={rates} onAdd={onAdd} />
      </Card>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(
          [
            ['day', 'By day'],
            ['safeguarding', `Safeguarding flags (${flagged.length})`],
          ] as [typeof view, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              view === id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'day' && (
        <Card>
          <div className="mb-3">
            <TextField label="Date" type="date" value={filterDate} onChange={setFilterDate} />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {dayRecords.map((r) => (
              <RecordRow
                key={r.id}
                record={r}
                child={childRecords.find((c) => c.id === r.childId)}
                rates={rates}
                onUpdate={(patch) => onUpdate(r.id, patch)}
                onDelete={() => onDelete(r.id)}
              />
            ))}
            {dayRecords.length === 0 && <p className="text-xs text-slate-400 py-2">No attendance logged for {formatDate(filterDate)}.</p>}
          </ul>
        </Card>
      )}

      {view === 'safeguarding' && (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {flagged.map((r) => (
              <RecordRow
                key={r.id}
                record={r}
                child={childRecords.find((c) => c.id === r.childId)}
                rates={rates}
                onUpdate={(patch) => onUpdate(r.id, patch)}
                onDelete={() => onDelete(r.id)}
                dateLabel={formatDate(r.date)}
              />
            ))}
            {flagged.length === 0 && <p className="text-xs text-slate-400 py-2">No safeguarding flags on record.</p>}
          </ul>
        </Card>
      )}
    </div>
  );
}
