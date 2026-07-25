import { useState } from 'react'
import type { FeasibilityStudy } from '../lib/types.ts'

interface CollectionApi<T> {
  items: T[]
  add: (item: Omit<T, 'id'>) => T
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
}

function newStudy(title: string): Omit<FeasibilityStudy, 'id'> {
  const now = new Date().toISOString()
  return {
    title,
    createdAt: now,
    updatedAt: now,
    address: '',
    what3words: '',
    lat: null,
    lon: null,
    operatorRecordId: null,
    flyerRecordIds: [],
    droneRecordIds: [],
    maxHeightAgl: 120,
    populatedArea: false,
    overCrowds: false,
    groundRiskBufferM: null,
    flyawayDistanceM: null,
    flyawayBubbleRadiusM: null,
    nearbyAerodromes: [],
    hazardLog: [],
    siteSurveyNotes: '',
    siteSurveyCompleted: false,
    status: 'draft',
  }
}

export default function StudiesPanel({
  studies,
  onOpen,
}: {
  studies: CollectionApi<FeasibilityStudy>
  onOpen: (id: string) => void
}) {
  const [title, setTitle] = useState('')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-base font-semibold">Feasibility studies</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Each study covers one site: location, ground risk buffer/flyaway mapping, airspace context and the
          hazard &amp; mitigation log. The site survey section is always left blank for on-site completion.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          const created = studies.add(newStudy(title.trim()))
          setTitle('')
          onOpen(created.id)
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New study title (e.g. site address or job reference)"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button type="submit" className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          New study
        </button>
      </form>

      {studies.items.length === 0 ? (
        <p className="text-sm text-slate-400">No feasibility studies yet.</p>
      ) : (
        <div className="space-y-2">
          {[...studies.items]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800"
              >
                <button className="text-left" onClick={() => onOpen(s.id)}>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {s.address || s.what3words || 'No location set'} · {s.status}
                  </div>
                </button>
                <div className="flex gap-3 text-xs">
                  <button onClick={() => onOpen(s.id)} className="text-teal-700 hover:underline dark:text-teal-400">
                    Open
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${s.title}"?`)) studies.remove(s.id)
                    }}
                    className="text-red-600 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
