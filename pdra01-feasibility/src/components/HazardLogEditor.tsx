import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { HazardEntry, RiskLevel } from '../lib/types.ts'
import { suggestHazards, type HazardContext } from '../data/hazards.ts'

const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High']

const riskStyles: Record<RiskLevel, string> = {
  Low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  High: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

const emptyCustom = {
  category: 'Other',
  hazard: '',
  cause: '',
  effect: '',
  initialRisk: 'Medium' as RiskLevel,
  mitigations: '',
  residualRisk: 'Low' as RiskLevel,
}

export default function HazardLogEditor({
  hazardLog,
  context,
  onChange,
}: {
  hazardLog: HazardEntry[]
  context: HazardContext
  onChange: (log: HazardEntry[]) => void
}) {
  const [customForm, setCustomForm] = useState(emptyCustom)
  const [showCustomForm, setShowCustomForm] = useState(false)

  const addedHazardNames = new Set(hazardLog.map((h) => h.hazard))
  const suggestions = suggestHazards(context).filter((t) => !addedHazardNames.has(t.hazard))

  function updateEntry(id: string, patch: Partial<HazardEntry>) {
    onChange(hazardLog.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  }

  function removeEntry(id: string) {
    onChange(hazardLog.filter((h) => h.id !== id))
  }

  function addFromTemplate(templateKey: string) {
    const t = suggestions.find((s) => s.key === templateKey)
    if (!t) return
    onChange([...hazardLog, { ...t, id: uuid(), isCustom: false }])
  }

  function addAllSuggested() {
    onChange([
      ...hazardLog,
      ...suggestions.map((t) => ({ ...t, id: uuid(), isCustom: false })),
    ])
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault()
    if (!customForm.hazard.trim()) return
    onChange([
      ...hazardLog,
      {
        id: uuid(),
        category: customForm.category,
        hazard: customForm.hazard,
        cause: customForm.cause,
        effect: customForm.effect,
        initialRisk: customForm.initialRisk,
        mitigations: customForm.mitigations.split('\n').map((m) => m.trim()).filter(Boolean),
        residualRisk: customForm.residualRisk,
        isCustom: true,
      },
    ])
    setCustomForm(emptyCustom)
    setShowCustomForm(false)
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        This hazard log is a template auto-populated from common PDRA01-style risks. It is a starting point only -
        a suitably qualified person must review, tailor and approve every entry against the current published CAA
        PDRA01 document and the operator's Operations Manual before use.
      </p>

      {hazardLog.length === 0 ? (
        <p className="text-sm text-slate-400">No hazards added yet - add suggested hazards below, or add a custom one.</p>
      ) : (
        <div className="space-y-3">
          {hazardLog.map((h) => (
            <div key={h.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {h.category}
                  </span>
                  <span className="font-medium">{h.hazard}</span>
                </div>
                <button onClick={() => removeEntry(h.id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                  Remove
                </button>
              </div>
              <dl className="mt-2 grid gap-1 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide">Cause</dt>
                  <dd>{h.cause}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide">Effect</dt>
                  <dd>{h.effect}</dd>
                </div>
              </dl>
              <div className="mt-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Mitigations
                </dt>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {h.mitigations.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <RiskSelect
                  label="Initial risk"
                  value={h.initialRisk}
                  onChange={(v) => updateEntry(h.id, { initialRisk: v })}
                />
                <RiskSelect
                  label="Residual risk"
                  value={h.residualRisk}
                  onChange={(v) => updateEntry(h.id, { residualRisk: v })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Suggested hazards ({suggestions.length})</h4>
            <button onClick={addAllSuggested} className="text-xs text-teal-700 hover:underline dark:text-teal-400">
              Add all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((t) => (
              <button
                key={t.key}
                onClick={() => addFromTemplate(t.key)}
                className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                + {t.hazard}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showCustomForm ? (
        <button
          onClick={() => setShowCustomForm(true)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
        >
          + Add custom hazard
        </button>
      ) : (
        <form onSubmit={addCustom} className="grid gap-2 rounded-md border border-slate-300 p-3 dark:border-slate-700">
          <input
            placeholder="Category"
            value={customForm.category}
            onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            placeholder="Hazard"
            value={customForm.hazard}
            onChange={(e) => setCustomForm({ ...customForm, hazard: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            required
          />
          <input
            placeholder="Cause"
            value={customForm.cause}
            onChange={(e) => setCustomForm({ ...customForm, cause: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            placeholder="Effect"
            value={customForm.effect}
            onChange={(e) => setCustomForm({ ...customForm, effect: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <textarea
            placeholder="Mitigations (one per line)"
            value={customForm.mitigations}
            onChange={(e) => setCustomForm({ ...customForm, mitigations: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            rows={3}
          />
          <div className="flex items-center gap-4">
            <RiskSelect
              label="Initial risk"
              value={customForm.initialRisk}
              onChange={(v) => setCustomForm({ ...customForm, initialRisk: v })}
            />
            <RiskSelect
              label="Residual risk"
              value={customForm.residualRisk}
              onChange={(v) => setCustomForm({ ...customForm, residualRisk: v })}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
              Add hazard
            </button>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function RiskSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: RiskLevel
  onChange: (v: RiskLevel) => void
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RiskLevel)}
        className={`rounded border-0 px-1.5 py-0.5 text-xs font-medium ${riskStyles[value]}`}
      >
        {RISK_LEVELS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </label>
  )
}
