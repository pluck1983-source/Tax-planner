import { useState } from 'react'
import { store, exportAllData, importAllData } from './lib/storage.ts'
import { useCollection } from './lib/useCollection.ts'
import type { Drone, FeasibilityStudy, Flyer, Operator } from './lib/types.ts'
import Dashboard from './components/Dashboard.tsx'
import PeoplePanel from './components/PeoplePanel.tsx'
import DronesPanel from './components/DronesPanel.tsx'
import StudiesPanel from './components/StudiesPanel.tsx'
import StudyEditor from './components/StudyEditor.tsx'

type Tab = 'dashboard' | 'people' | 'drones' | 'studies'

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [openStudyId, setOpenStudyId] = useState<string | null>(null)

  const operators = useCollection<Operator>(store.loadOperators, store.saveOperators)
  const flyers = useCollection<Flyer>(store.loadFlyers, store.saveFlyers)
  const drones = useCollection<Drone>(store.loadDrones, store.saveDrones)
  const studies = useCollection<FeasibilityStudy>(store.loadStudies, store.saveStudies)

  function handleExport() {
    const blob = new Blob([exportAllData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pdra01-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      importAllData(text)
      window.location.reload()
    })
    e.target.value = ''
  }

  const openStudy = openStudyId ? studies.items.find((s) => s.id === openStudyId) ?? null : null

  if (openStudy) {
    return (
      <StudyEditor
        study={openStudy}
        onUpdate={(patch) => studies.update(openStudy.id, { ...patch, updatedAt: new Date().toISOString() })}
        onClose={() => setOpenStudyId(null)}
        operators={operators.items}
        flyers={flyers.items}
        drones={drones.items}
      />
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'people', label: 'Operator & Flyers' },
    { key: 'drones', label: 'Drones' },
    { key: 'studies', label: 'Feasibility Studies' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="no-print border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h1 className="text-lg font-semibold text-teal-700 dark:text-teal-400">PDRA01 Feasibility</h1>
          <nav className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.key
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex gap-2 text-xs">
            <button
              onClick={handleExport}
              className="rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Export data
            </button>
            <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Import data
              <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'dashboard' && (
          <Dashboard
            operators={operators.items}
            flyers={flyers.items}
            drones={drones.items}
            studies={studies.items}
            onNavigate={setTab}
          />
        )}
        {tab === 'people' && <PeoplePanel operators={operators} flyers={flyers} />}
        {tab === 'drones' && <DronesPanel drones={drones} />}
        {tab === 'studies' && <StudiesPanel studies={studies} onOpen={setOpenStudyId} />}
      </main>
    </div>
  )
}
