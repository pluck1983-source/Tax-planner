import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { attendancePatternForDate, weeklyScheduledHours } from '../lib/forecastEngine';
import { currentAgeBand } from '../lib/fundingEngine';
import { formatDate, formatHours } from '../lib/format';
import { parseISODate } from '../lib/dateUtils';
import type {
  AgeBand,
  AttendancePattern,
  AttendancePatternChange,
  Child,
  ChildFundingType,
  Contact,
  DayOfWeek,
  EmergencyContact,
  LocalAuthority,
  ScheduleDay,
} from '../lib/types';
import { Card, SelectField, SmallButton, TextField } from './ui';

interface Props {
  childRecords: Child[];
  localAuthorities: LocalAuthority[];
  ageBands: AgeBand[];
  onAdd: (child: Omit<Child, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Child>) => void;
  onDelete: (id: string) => void;
  onAddPatternChange: (childId: string, change: Omit<AttendancePatternChange, 'id'>) => void;
  onDeletePatternChange: (childId: string, id: string) => void;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const FUNDING_OPTIONS: { value: ChildFundingType; label: string }[] = [
  { value: 'none', label: 'Not funded (private only)' },
  { value: 'universal15', label: '15 hours universal' },
  { value: 'extended30', label: '30 hours extended (working parents)' },
];

const EMPTY_CONTACT: Contact = { name: '', phone: '', email: '' };

function emptyChild(): Omit<Child, 'id'> {
  return {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    primaryParent: { ...EMPTY_CONTACT },
    secondaryParent: null,
    emergencyContact: null,
    localAuthorityId: null,
    fundingType: 'none',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    active: true,
    weeklySchedule: [],
    attendancePatternHistory: [],
    notes: '',
  };
}

const PATTERN_LABELS: Record<AttendancePattern, string> = {
  fullTime: 'Full time (year-round, including school holidays)',
  termTimeOnly: 'Term time only (no care needed in school holidays)',
};

function ContactFields({ label, contact, onChange }: { label: string; contact: Contact; onChange: (c: Contact) => void }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <TextField label="Name" value={contact.name} onChange={(v) => onChange({ ...contact, name: v })} />
        <TextField label="Phone" type="tel" value={contact.phone} onChange={(v) => onChange({ ...contact, phone: v })} />
        <TextField label="Email" type="email" value={contact.email} onChange={(v) => onChange({ ...contact, email: v })} />
      </div>
    </div>
  );
}

function WeeklyScheduleEditor({ schedule, onChange }: { schedule: ScheduleDay[]; onChange: (s: ScheduleDay[]) => void }) {
  function dayFor(dow: DayOfWeek): ScheduleDay | undefined {
    return schedule.find((d) => d.dayOfWeek === dow);
  }
  function toggle(dow: DayOfWeek, enabled: boolean) {
    if (enabled) {
      onChange([...schedule, { dayOfWeek: dow, startTime: '08:00', endTime: '17:30' }]);
    } else {
      onChange(schedule.filter((d) => d.dayOfWeek !== dow));
    }
  }
  function setTime(dow: DayOfWeek, field: 'startTime' | 'endTime', value: string) {
    onChange(schedule.map((d) => (d.dayOfWeek === dow ? { ...d, [field]: value } : d)));
  }

  return (
    <div className="space-y-2">
      {DAYS.map(({ value, label }) => {
        const day = dayFor(value);
        return (
          <div key={value} className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5 w-14 shrink-0">
              <input type="checkbox" checked={!!day} onChange={(e) => toggle(value, e.target.checked)} />
              {label}
            </label>
            {day ? (
              <>
                <input
                  type="time"
                  className="px-2 py-1 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
                  value={day.startTime}
                  onChange={(e) => setTime(value, 'startTime', e.target.value)}
                />
                <span className="text-slate-400">-</span>
                <input
                  type="time"
                  className="px-2 py-1 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
                  value={day.endTime}
                  onChange={(e) => setTime(value, 'endTime', e.target.value)}
                />
              </>
            ) : (
              <span className="text-xs text-slate-400">not attending</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttendancePatternEditor({
  history,
  onAdd,
  onDelete,
}: {
  history: AttendancePatternChange[];
  onAdd: (change: Omit<AttendancePatternChange, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [pattern, setPattern] = useState<AttendancePattern>('fullTime');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const current = attendancePatternForDate({ attendancePatternHistory: history } as Child, new Date());
  const sorted = [...history].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Attendance pattern</p>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
          Currently: {PATTERN_LABELS[current]}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-2 max-w-2xl">
        Term-time-only children aren't billed at all in weeks outside term time (not even at the holiday retainer
        rate, since there's no ongoing contract for those weeks). Parents can switch between the two at any time -
        record the date the change takes effect rather than overwriting history.
      </p>
      {sorted.length > 0 && (
        <ul className="text-xs space-y-1 mb-2">
          {sorted.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span>{PATTERN_LABELS[p.pattern]}</span>
              <span className="text-slate-400">from {formatDate(p.effectiveFrom)}</span>
              <button type="button" onClick={() => onDelete(p.id)} className="text-rose-500 hover:underline ml-auto">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd({ pattern, effectiveFrom });
        }}
      >
        <SelectField
          label="Change to"
          value={pattern}
          onChange={setPattern}
          options={(Object.keys(PATTERN_LABELS) as AttendancePattern[]).map((p) => ({ value: p, label: PATTERN_LABELS[p] }))}
        />
        <TextField label="Effective from" type="date" value={effectiveFrom} onChange={setEffectiveFrom} />
        <SmallButton type="submit" variant="primary">
          Save change
        </SmallButton>
      </form>
    </div>
  );
}

export function ChildrenManager({ childRecords, localAuthorities, ageBands, onAdd, onUpdate, onDelete, onAddPatternChange, onDeletePatternChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(childRecords[0]?.id ?? null);
  const [adding, setAdding] = useState(childRecords.length === 0);
  const [draft, setDraft] = useState(emptyChild());
  // Falls back to the most recently added child when nothing matches - keeps a newly-added or
  // just-deleted selection from landing on an empty "add a child" placeholder for no reason.
  const selected = childRecords.find((c) => c.id === selectedId) ?? (adding ? null : (childRecords.at(-1) ?? null));

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.firstName.trim() || !draft.dateOfBirth) return;
    onAdd({
      ...draft,
      attendancePatternHistory: [{ id: uuid(), pattern: 'fullTime', effectiveFrom: draft.startDate }],
    });
    setDraft(emptyChild());
    setAdding(false);
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-64 shrink-0 space-y-2">
        <SmallButton variant="primary" onClick={() => setAdding(true)}>
          + Add child
        </SmallButton>
        <nav className="flex flex-col gap-1">
          {childRecords.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id);
                setAdding(false);
              }}
              className={`text-left px-3 py-2 rounded-lg border text-sm whitespace-nowrap flex items-center justify-between gap-2 ${
                selectedId === c.id && !adding
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              <span>
                {c.firstName} {c.lastName}
              </span>
              {!c.active && <span className="text-xs opacity-60 shrink-0">inactive</span>}
            </button>
          ))}
          {childRecords.length === 0 && <p className="text-xs text-slate-400 px-1">No children added yet.</p>}
        </nav>
      </div>

      <div className="flex-1 min-w-0">
        {adding && (
          <Card>
            <h3 className="text-sm font-semibold mb-3">New child</h3>
            <form className="space-y-4" onSubmit={submitDraft}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="First name" value={draft.firstName} onChange={(v) => setDraft({ ...draft, firstName: v })} />
                <TextField label="Last name" value={draft.lastName} onChange={(v) => setDraft({ ...draft, lastName: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="Date of birth" type="date" value={draft.dateOfBirth} onChange={(v) => setDraft({ ...draft, dateOfBirth: v })} />
                <TextField label="Contract start date" type="date" value={draft.startDate} onChange={(v) => setDraft({ ...draft, startDate: v })} />
              </div>
              <ContactFields label="Primary parent/carer" contact={draft.primaryParent} onChange={(c) => setDraft({ ...draft, primaryParent: c })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  label="Local authority"
                  value={draft.localAuthorityId ?? 'none'}
                  onChange={(v) => setDraft({ ...draft, localAuthorityId: v === 'none' ? null : v })}
                  options={[{ value: 'none', label: 'Not set' }, ...localAuthorities.map((l) => ({ value: l.id, label: l.name }))]}
                />
                <SelectField label="Funding" value={draft.fundingType} onChange={(v) => setDraft({ ...draft, fundingType: v })} options={FUNDING_OPTIONS} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Proposed weekly hours</p>
                <WeeklyScheduleEditor schedule={draft.weeklySchedule} onChange={(s) => setDraft({ ...draft, weeklySchedule: s })} />
              </div>
              <div className="flex gap-2">
                <SmallButton type="submit" variant="primary">
                  Add child
                </SmallButton>
                <SmallButton onClick={() => setAdding(false)}>Cancel</SmallButton>
              </div>
            </form>
          </Card>
        )}

        {!adding && !selected && <p className="text-slate-400 text-sm">Add a child to get started.</p>}

        {!adding && selected && (
          <ChildDetail
            child={selected}
            localAuthorities={localAuthorities}
            ageBands={ageBands}
            onUpdate={(patch) => onUpdate(selected.id, patch)}
            onAddPatternChange={(change) => onAddPatternChange(selected.id, change)}
            onDeletePatternChange={(id) => onDeletePatternChange(selected.id, id)}
            onDelete={() => {
              if (window.confirm(`Remove ${selected.firstName} ${selected.lastName}? This also removes their holidays and attendance records.`)) {
                onDelete(selected.id);
                setSelectedId(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function QuickContact({ contact, extra }: { contact: Contact; extra?: string }) {
  if (!contact.name && !contact.phone && !contact.email) return null;
  return (
    <div className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-medium">{contact.name || 'Unnamed'}</span>
      {extra && <span className="text-xs text-slate-400">{extra}</span>}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
          {contact.phone}
        </a>
      )}
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
          {contact.email}
        </a>
      )}
    </div>
  );
}

function ChildDetail({
  child,
  localAuthorities,
  ageBands,
  onUpdate,
  onAddPatternChange,
  onDeletePatternChange,
  onDelete,
}: {
  child: Child;
  localAuthorities: LocalAuthority[];
  ageBands: AgeBand[];
  onUpdate: (patch: Partial<Child>) => void;
  onAddPatternChange: (change: Omit<AttendancePatternChange, 'id'>) => void;
  onDeletePatternChange: (id: string) => void;
  onDelete: () => void;
}) {
  const hours = weeklyScheduledHours(child);
  const band = child.dateOfBirth ? currentAgeBand(parseISODate(child.dateOfBirth), ageBands, new Date()) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {child.firstName} {child.lastName}
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={child.active} onChange={(e) => onUpdate({ active: e.target.checked })} />
            Active
          </label>
          <SmallButton variant="danger" onClick={onDelete}>
            Remove
          </SmallButton>
        </div>
      </div>

      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Quick access</p>
        <div className="space-y-1.5">
          <QuickContact contact={child.primaryParent} extra="Primary" />
          {child.secondaryParent && <QuickContact contact={child.secondaryParent} extra="Secondary" />}
          {child.emergencyContact && <QuickContact contact={child.emergencyContact} extra={`Emergency - ${child.emergencyContact.relationship || 'contact'}`} />}
          {!child.primaryParent.phone && !child.secondaryParent?.phone && !child.emergencyContact?.phone && (
            <p className="text-xs text-slate-400">No contact numbers on file yet.</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="First name" value={child.firstName} onChange={(v) => onUpdate({ firstName: v })} />
        <TextField label="Last name" value={child.lastName} onChange={(v) => onUpdate({ lastName: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="Date of birth" type="date" value={child.dateOfBirth} onChange={(v) => onUpdate({ dateOfBirth: v })} />
        <div className="text-sm flex flex-col gap-1">
          <span className="text-slate-500 dark:text-slate-400">Current age band</span>
          <span className="px-2 py-1.5">{band?.label ?? 'Under funding age'}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="Contract start date" type="date" value={child.startDate} onChange={(v) => onUpdate({ startDate: v })} />
        <TextField label="Contract end date" type="date" value={child.endDate ?? ''} onChange={(v) => onUpdate({ endDate: v || null })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField
          label="Local authority"
          value={child.localAuthorityId ?? 'none'}
          onChange={(v) => onUpdate({ localAuthorityId: v === 'none' ? null : v })}
          options={[{ value: 'none', label: 'Not set' }, ...localAuthorities.map((l) => ({ value: l.id, label: l.name }))]}
        />
        <SelectField label="Funding" value={child.fundingType} onChange={(v) => onUpdate({ fundingType: v })} options={FUNDING_OPTIONS} />
      </div>

      <ContactFields label="Primary parent/carer" contact={child.primaryParent} onChange={(c) => onUpdate({ primaryParent: c })} />

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Secondary parent/carer</p>
          {!child.secondaryParent ? (
            <button type="button" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => onUpdate({ secondaryParent: { ...EMPTY_CONTACT } })}>
              + Add
            </button>
          ) : (
            <button type="button" className="text-xs text-rose-500 hover:underline" onClick={() => onUpdate({ secondaryParent: null })}>
              Remove
            </button>
          )}
        </div>
        {child.secondaryParent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <TextField label="Name" value={child.secondaryParent.name} onChange={(v) => onUpdate({ secondaryParent: { ...child.secondaryParent!, name: v } })} />
            <TextField label="Phone" type="tel" value={child.secondaryParent.phone} onChange={(v) => onUpdate({ secondaryParent: { ...child.secondaryParent!, phone: v } })} />
            <TextField label="Email" type="email" value={child.secondaryParent.email} onChange={(v) => onUpdate({ secondaryParent: { ...child.secondaryParent!, email: v } })} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Emergency contact</p>
          {!child.emergencyContact ? (
            <button
              type="button"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              onClick={() => onUpdate({ emergencyContact: { ...EMPTY_CONTACT, relationship: '' } })}
            >
              + Add
            </button>
          ) : (
            <button type="button" className="text-xs text-rose-500 hover:underline" onClick={() => onUpdate({ emergencyContact: null })}>
              Remove
            </button>
          )}
        </div>
        {child.emergencyContact && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <TextField
              label="Name"
              value={child.emergencyContact.name}
              onChange={(v) => onUpdate({ emergencyContact: { ...(child.emergencyContact as EmergencyContact), name: v } })}
            />
            <TextField
              label="Relationship"
              value={child.emergencyContact.relationship}
              onChange={(v) => onUpdate({ emergencyContact: { ...(child.emergencyContact as EmergencyContact), relationship: v } })}
            />
            <TextField
              label="Phone"
              type="tel"
              value={child.emergencyContact.phone}
              onChange={(v) => onUpdate({ emergencyContact: { ...(child.emergencyContact as EmergencyContact), phone: v } })}
            />
            <TextField
              label="Email"
              type="email"
              value={child.emergencyContact.email}
              onChange={(v) => onUpdate({ emergencyContact: { ...(child.emergencyContact as EmergencyContact), email: v } })}
            />
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Proposed weekly hours - <span className="font-medium text-slate-700 dark:text-slate-200">{formatHours(hours)}/week</span>
        </p>
        <WeeklyScheduleEditor schedule={child.weeklySchedule} onChange={(s) => onUpdate({ weeklySchedule: s })} />
      </div>

      <AttendancePatternEditor history={child.attendancePatternHistory} onAdd={onAddPatternChange} onDelete={onDeletePatternChange} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Notes</span>
        <textarea
          className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
          rows={2}
          value={child.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
