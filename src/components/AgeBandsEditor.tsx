import { useState } from 'react';
import type { AgeBand } from '../lib/types';
import { Card, NumberField, SmallButton, TextField } from './ui';

interface Props {
  ageBands: AgeBand[];
  onAdd: (band: Omit<AgeBand, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<AgeBand>) => void;
  onDelete: (id: string) => void;
}

export function AgeBandsEditor({ ageBands, onAdd, onUpdate, onDelete }: Props) {
  const [label, setLabel] = useState('');
  const [minAgeMonths, setMinAgeMonths] = useState(0);
  const sorted = [...ageBands].sort((a, b) => a.minAgeMonths - b.minAgeMonths);

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-1">Age bands</h3>
      <p className="text-xs text-slate-400 mb-3 max-w-2xl">
        Funding rates and eligibility are calculated against these bands. The minimum age is when a child becomes
        eligible for a band's funding - actual funding then starts from the next term following that date, not
        immediately.
      </p>
      <ul className="space-y-2 mb-4">
        {sorted.map((band) => (
          <li key={band.id} className="flex items-center gap-2 text-sm">
            <input
              className="flex-1 px-2 py-1 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
              value={band.label}
              onChange={(e) => onUpdate(band.id, { label: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className="w-24 px-2 py-1 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
              value={band.minAgeMonths}
              onChange={(e) => onUpdate(band.id, { minAgeMonths: Number(e.target.value) })}
            />
            <span className="text-xs text-slate-400 shrink-0">months+</span>
            <button type="button" onClick={() => onDelete(band.id)} className="text-xs text-rose-500 hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2 flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          onAdd({ label: label.trim(), minAgeMonths });
          setLabel('');
          setMinAgeMonths(0);
        }}
      >
        <TextField label="New band label" value={label} onChange={setLabel} placeholder="e.g. 4 years+" />
        <NumberField label="Minimum age" value={minAgeMonths} onChange={setMinAgeMonths} suffix="months" min={0} />
        <SmallButton type="submit" variant="primary">
          Add band
        </SmallButton>
      </form>
    </Card>
  );
}
