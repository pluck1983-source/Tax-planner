import { useState } from 'react'
import type { Flyer, Operator } from '../lib/types.ts'
import { expiryLabel, expiryStatus, expiryStatusStyles } from '../lib/expiry.ts'

interface CollectionApi<T> {
  items: T[]
  add: (item: Omit<T, 'id'>) => T
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
}

interface Props {
  operators: CollectionApi<Operator>
  flyers: CollectionApi<Flyer>
}

const emptyOperator: Omit<Operator, 'id'> = { organisationOrName: '', operatorId: '', registrationExpiry: '' }
const emptyFlyer: Omit<Flyer, 'id'> = { name: '', flyerId: '', testPassDate: '', expiryDate: '' }

export default function PeoplePanel({ operators, flyers }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-base font-semibold">Operator IDs</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          UK CAA Operator registration - required for all but the lightest drones, renews annually.
        </p>
        <EntityTable
          items={operators.items}
          columns={[
            { key: 'organisationOrName', label: 'Operator / organisation' },
            { key: 'operatorId', label: 'Operator ID' },
            {
              key: 'registrationExpiry',
              label: 'Renewal due',
              render: (o: Operator) => <ExpiryBadge date={o.registrationExpiry} />,
            },
          ]}
          onRemove={operators.remove}
        />
        <AddForm
          fields={[
            { name: 'organisationOrName', label: 'Operator / organisation name', type: 'text' },
            { name: 'operatorId', label: 'Operator ID (e.g. GBR-OP-XXXXXXXXXXXX)', type: 'text' },
            { name: 'registrationExpiry', label: 'Registration renewal date', type: 'date' },
          ]}
          initial={emptyOperator}
          onSubmit={(v) => operators.add(v as Omit<Operator, 'id'>)}
          submitLabel="Add operator ID"
        />
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold">Flyer IDs</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          One entry per remote pilot who holds a Flyer ID from the CAA online theory test.
        </p>
        <EntityTable
          items={flyers.items}
          columns={[
            { key: 'name', label: 'Pilot' },
            { key: 'flyerId', label: 'Flyer ID' },
            { key: 'expiryDate', label: 'Expiry', render: (f: Flyer) => <ExpiryBadge date={f.expiryDate} /> },
          ]}
          onRemove={flyers.remove}
        />
        <AddForm
          fields={[
            { name: 'name', label: 'Pilot name', type: 'text' },
            { name: 'flyerId', label: 'Flyer ID (e.g. GBR-FLY-XXXXXXXXXXXX)', type: 'text' },
            { name: 'testPassDate', label: 'Theory test pass date', type: 'date' },
            { name: 'expiryDate', label: 'Flyer ID expiry date', type: 'date' },
          ]}
          initial={emptyFlyer}
          onSubmit={(v) => flyers.add(v as Omit<Flyer, 'id'>)}
          submitLabel="Add flyer ID"
        />
      </section>
    </div>
  )
}

function ExpiryBadge({ date }: { date: string }) {
  if (!date) return <span className="text-slate-400">—</span>
  const status = expiryStatus(date)
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${expiryStatusStyles[status]}`}>
      {expiryLabel(date)}
    </span>
  )
}

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

function EntityTable<T extends { id: string }>({
  items,
  columns,
  onRemove,
}: {
  items: T[]
  columns: Column<T>[]
  onRemove: (id: string) => void
}) {
  if (items.length === 0) {
    return <p className="mb-3 text-sm text-slate-400">None added yet.</p>
  }
  return (
    <div className="mb-3 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left dark:bg-slate-800">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {c.render ? c.render(item) : String((item as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'date'
}

function AddForm<T extends Record<string, string>>({
  fields,
  initial,
  onSubmit,
  submitLabel,
}: {
  fields: FieldDef[]
  initial: T
  onSubmit: (values: T) => void
  submitLabel: string
}) {
  const [values, setValues] = useState<T>(initial)

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(values)
        setValues(initial)
      }}
    >
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
          {f.label}
          <input
            type={f.type}
            value={values[f.name] ?? ''}
            onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
        </label>
      ))}
      <button type="submit" className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
        {submitLabel}
      </button>
    </form>
  )
}
