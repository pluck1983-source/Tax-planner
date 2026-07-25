import { useState } from 'react'
import type { ClassMarking, Drone } from '../lib/types.ts'

interface CollectionApi<T> {
  items: T[]
  add: (item: Omit<T, 'id'>) => T
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
}

const CLASS_MARKINGS: ClassMarking[] = ['C0', 'C1', 'C2', 'C3', 'C4', 'none']

const emptyDrone: Omit<Drone, 'id'> = {
  manufacturer: '',
  model: '',
  serialNumber: '',
  controllerSerialNumber: '',
  classMarking: 'C1',
  mtomKg: 0,
  maxDimensionMm: 0,
  maxSpeedMs: 0,
  hasRemoteId: false,
  hasCamera: true,
  notes: '',
}

export default function DronesPanel({ drones }: { drones: CollectionApi<Drone> }) {
  const [form, setForm] = useState<Omit<Drone, 'id'>>(emptyDrone)
  const [editingId, setEditingId] = useState<string | null>(null)

  function startEdit(d: Drone) {
    setEditingId(d.id)
    setForm({ ...d })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyDrone)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      drones.update(editingId, form)
    } else {
      drones.add(form)
    }
    resetForm()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-base font-semibold">Drone & controller registry</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Manufacturer performance data (max speed, dimension, MTOM) drives the ground risk buffer and flyaway
          distance calculations used in feasibility studies.
        </p>

        {drones.items.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400">No drones registered yet.</p>
        ) : (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {drones.items.map((d) => (
              <div key={d.id} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {d.manufacturer} {d.model}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Class {d.classMarking === 'none' ? 'unmarked / legacy' : d.classMarking}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => startEdit(d)} className="text-teal-700 hover:underline dark:text-teal-400">
                      Edit
                    </button>
                    <button onClick={() => drones.remove(d.id)} className="text-red-600 hover:underline dark:text-red-400">
                      Remove
                    </button>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <dt>Drone serial</dt>
                  <dd className="text-right font-mono">{d.serialNumber || '—'}</dd>
                  <dt>Controller serial</dt>
                  <dd className="text-right font-mono">{d.controllerSerialNumber || '—'}</dd>
                  <dt>MTOM</dt>
                  <dd className="text-right">{d.mtomKg} kg</dd>
                  <dt>Max dimension</dt>
                  <dd className="text-right">{d.maxDimensionMm} mm</dd>
                  <dt>Max speed</dt>
                  <dd className="text-right">{d.maxSpeedMs} m/s</dd>
                  <dt>Remote ID</dt>
                  <dd className="text-right">{d.hasRemoteId ? 'Yes' : 'No'}</dd>
                  <dt>Camera</dt>
                  <dd className="text-right">{d.hasCamera ? 'Yes' : 'No'}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-md border border-dashed border-slate-300 p-4 sm:grid-cols-2 dark:border-slate-700"
      >
        <h3 className="col-span-full text-sm font-semibold">{editingId ? 'Edit drone' : 'Register a drone'}</h3>

        <TextField label="Manufacturer" value={form.manufacturer} onChange={(v) => setForm({ ...form, manufacturer: v })} />
        <TextField label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
        <TextField
          label="Drone serial number"
          value={form.serialNumber}
          onChange={(v) => setForm({ ...form, serialNumber: v })}
        />
        <TextField
          label="Controller serial number"
          value={form.controllerSerialNumber}
          onChange={(v) => setForm({ ...form, controllerSerialNumber: v })}
        />

        <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
          Class marking
          <select
            value={form.classMarking}
            onChange={(e) => setForm({ ...form, classMarking: e.target.value as ClassMarking })}
            className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {CLASS_MARKINGS.map((c) => (
              <option key={c} value={c}>
                {c === 'none' ? 'None / legacy (unmarked)' : c}
              </option>
            ))}
          </select>
        </label>

        <NumberField label="MTOM (kg)" value={form.mtomKg} onChange={(v) => setForm({ ...form, mtomKg: v })} />
        <NumberField
          label="Max characteristic dimension (mm)"
          value={form.maxDimensionMm}
          onChange={(v) => setForm({ ...form, maxDimensionMm: v })}
        />
        <NumberField
          label="Max horizontal speed (m/s)"
          value={form.maxSpeedMs}
          onChange={(v) => setForm({ ...form, maxSpeedMs: v })}
        />

        <div className="flex items-center gap-4 pt-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.hasRemoteId}
              onChange={(e) => setForm({ ...form, hasRemoteId: e.target.checked })}
            />
            Remote ID (direct)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.hasCamera}
              onChange={(e) => setForm({ ...form, hasCamera: e.target.checked })}
            />
            Has camera
          </label>
        </div>

        <label className="col-span-full flex flex-col text-xs text-slate-600 dark:text-slate-400">
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={2}
          />
        </label>

        <div className="col-span-full flex gap-2">
          <button type="submit" className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
            {editingId ? 'Save changes' : 'Register drone'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
      {label}
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>
  )
}
