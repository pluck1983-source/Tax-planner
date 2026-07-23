import { useState } from 'react';
import { formatDate } from '../lib/format';
import type { Term } from '../lib/types';
import { Card, SmallButton, TextField } from './ui';

interface Props {
  terms: Term[];
  onAdd: (term: Omit<Term, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Term>) => void;
  onDelete: (id: string) => void;
}

function emptyTerm(): Omit<Term, 'id'> {
  return { label: '', academicYear: '', startDate: '', endDate: '' };
}

export function TermDatesManager({ terms, onAdd, onUpdate, onDelete }: Props) {
  const [draft, setDraft] = useState(emptyTerm());
  const sorted = [...terms].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
        Free early education funding only applies during term time - weeks outside every term below are treated as
        non-term weeks, so funded hours aren't billed then (though the childminder's own non-funded rate still
        applies if a child attends). Add each term as your setting's calendar is confirmed.
      </p>

      <Card>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((t) => (
            <li key={t.id} className="py-3 first:pt-0 last:pb-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                <TextField label="Label" value={t.label} onChange={(v) => onUpdate(t.id, { label: v })} />
                <TextField label="Academic year" value={t.academicYear} onChange={(v) => onUpdate(t.id, { academicYear: v })} />
                <TextField label="Start date" type="date" value={t.startDate} onChange={(v) => onUpdate(t.id, { startDate: v })} />
                <TextField label="End date" type="date" value={t.endDate} onChange={(v) => onUpdate(t.id, { endDate: v })} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  {t.startDate && t.endDate ? `${formatDate(t.startDate)} - ${formatDate(t.endDate)}` : 'Set both dates'}
                </span>
                <button type="button" onClick={() => onDelete(t.id)} className="text-xs text-rose-500 hover:underline">
                  Remove term
                </button>
              </div>
            </li>
          ))}
          {sorted.length === 0 && <p className="text-xs text-slate-400 py-2">No terms added yet.</p>}
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Add a term</h3>
        <form
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.label.trim() || !draft.startDate || !draft.endDate) return;
            onAdd(draft);
            setDraft(emptyTerm());
          }}
        >
          <TextField label="Label" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} placeholder="e.g. Autumn" />
          <TextField label="Academic year" value={draft.academicYear} onChange={(v) => setDraft({ ...draft, academicYear: v })} placeholder="e.g. 2026/27" />
          <TextField label="Start date" type="date" value={draft.startDate} onChange={(v) => setDraft({ ...draft, startDate: v })} />
          <TextField label="End date" type="date" value={draft.endDate} onChange={(v) => setDraft({ ...draft, endDate: v })} />
          <div className="col-span-2 sm:col-span-4">
            <SmallButton type="submit" variant="primary">
              Add term
            </SmallButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
