import type { Drone, FeasibilityStudy, Flyer, Operator } from '../lib/types.ts'
import { expiryLabel, expiryStatus, expiryStatusStyles } from '../lib/expiry.ts'

interface Props {
  operators: Operator[]
  flyers: Flyer[]
  drones: Drone[]
  studies: FeasibilityStudy[]
  onNavigate: (tab: 'people' | 'drones' | 'studies') => void
}

export default function Dashboard({ operators, flyers, drones, studies, onNavigate }: Props) {
  const idExpiries = [
    ...operators.map((o) => ({ label: `Operator ID (${o.organisationOrName || o.operatorId})`, date: o.registrationExpiry })),
    ...flyers.map((f) => ({ label: `Flyer ID (${f.name || f.flyerId})`, date: f.expiryDate })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  const flagged = idExpiries.filter((e) => expiryStatus(e.date) === 'expired' || expiryStatus(e.date) === 'due-soon')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Operator IDs" value={operators.length} onClick={() => onNavigate('people')} />
        <StatCard label="Flyer IDs" value={flyers.length} onClick={() => onNavigate('people')} />
        <StatCard label="Drones" value={drones.length} onClick={() => onNavigate('drones')} />
        <StatCard label="Feasibility studies" value={studies.length} onClick={() => onNavigate('studies')} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          ID renewal status
        </h2>
        {idExpiries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No operator or flyer IDs recorded yet.{' '}
            <button className="text-teal-700 underline dark:text-teal-400" onClick={() => onNavigate('people')}>
              Add one
            </button>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {idExpiries.map((e, i) => {
              const status = expiryStatus(e.date)
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${expiryStatusStyles[status]}`}
                >
                  <span>{e.label}</span>
                  <span className="font-medium">{expiryLabel(e.date)}</span>
                </div>
              )
            })}
          </div>
        )}
        {flagged.length > 0 && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            {flagged.length} ID{flagged.length === 1 ? ' is' : 's are'} expired or due for renewal within 60 days.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Recent feasibility studies
        </h2>
        {studies.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No studies yet.{' '}
            <button className="text-teal-700 underline dark:text-teal-400" onClick={() => onNavigate('studies')}>
              Start one
            </button>
            .
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...studies]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 5)
              .map((s) => (
                <li key={s.id} className="flex justify-between rounded border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <span>{s.title || 'Untitled study'}</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.status}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="text-2xl font-semibold text-teal-700 dark:text-teal-400">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </button>
  )
}
