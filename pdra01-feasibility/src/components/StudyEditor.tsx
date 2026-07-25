import { useState } from 'react'
import type { Drone, FeasibilityStudy, Flyer, Operator } from '../lib/types.ts'
import { convertToCoordinates, getApiKey, isPlausibleWhat3Words } from '../lib/what3words.ts'
import { recomputeStudy } from '../lib/studyCompute.ts'
import MapView from './MapView.tsx'
import HazardLogEditor from './HazardLogEditor.tsx'
import ReportView from './ReportView.tsx'

interface Props {
  study: FeasibilityStudy
  onUpdate: (patch: Partial<FeasibilityStudy>) => void
  onClose: () => void
  operators: Operator[]
  flyers: Flyer[]
  drones: Drone[]
}

export default function StudyEditor({ study, onUpdate, onClose, operators, flyers, drones }: Props) {
  const [w3wLookupState, setW3wLookupState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [w3wError, setW3wError] = useState('')
  const [showReport, setShowReport] = useState(false)

  function applyPatchAndRecompute(patch: Partial<FeasibilityStudy>) {
    const merged = { ...study, ...patch }
    const computed = recomputeStudy(merged, drones)
    onUpdate({ ...patch, ...computed })
  }

  async function lookupW3W() {
    if (!isPlausibleWhat3Words(study.what3words)) {
      setW3wLookupState('error')
      setW3wError('Enter a three-word address like filled.count.soap')
      return
    }
    setW3wLookupState('loading')
    try {
      const coords = await convertToCoordinates(study.what3words)
      applyPatchAndRecompute({ lat: coords.lat, lon: coords.lng })
      setW3wLookupState('idle')
    } catch (err) {
      setW3wLookupState('error')
      setW3wError(err instanceof Error ? err.message : 'Lookup failed')
    }
  }

  function toggleId(field: 'flyerRecordIds' | 'droneRecordIds', id: string) {
    const current = study[field]
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    applyPatchAndRecompute({ [field]: next } as Partial<FeasibilityStudy>)
  }

  if (showReport) {
    return (
      <ReportView
        study={study}
        operator={operators.find((o) => o.id === study.operatorRecordId) ?? null}
        flyers={flyers.filter((f) => study.flyerRecordIds.includes(f.id))}
        drones={drones.filter((d) => study.droneRecordIds.includes(d.id))}
        onBack={() => setShowReport(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <button onClick={onClose} className="text-sm text-teal-700 hover:underline dark:text-teal-400">
            ← Back to studies
          </button>
          <input
            value={study.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-center text-lg font-semibold hover:border-slate-300 focus:border-slate-300 dark:hover:border-slate-700 dark:focus:border-slate-700"
          />
          <button
            onClick={() => setShowReport(true)}
            className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            View report
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Site location
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
              Address
              <input
                value={study.address}
                onChange={(e) => onUpdate({ address: e.target.value })}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                placeholder="Site address"
              />
            </label>
            <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
              what3words
              <div className="mt-1 flex gap-2">
                <input
                  value={study.what3words}
                  onChange={(e) => onUpdate({ what3words: e.target.value })}
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                  placeholder="///filled.count.soap"
                />
                <button
                  onClick={lookupW3W}
                  disabled={w3wLookupState === 'loading'}
                  className="rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {w3wLookupState === 'loading' ? 'Looking up…' : 'Locate'}
                </button>
              </div>
              {w3wLookupState === 'error' && <p className="mt-1 text-red-600 dark:text-red-400">{w3wError}</p>}
              {!getApiKey() && (
                <p className="mt-1 text-slate-400">
                  No what3words API key configured - set VITE_WHAT3WORDS_API_KEY, or enter lat/lon manually below.
                </p>
              )}
            </div>
            <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
              Latitude
              <input
                type="number"
                step="any"
                value={study.lat ?? ''}
                onChange={(e) => applyPatchAndRecompute({ lat: e.target.value === '' ? null : Number(e.target.value) })}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
              Longitude
              <input
                type="number"
                step="any"
                value={study.lon ?? ''}
                onChange={(e) => applyPatchAndRecompute({ lon: e.target.value === '' ? null : Number(e.target.value) })}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>

          {study.lat !== null && study.lon !== null && (
            <div className="mt-3 space-y-2">
              <MapView
                lat={study.lat}
                lon={study.lon}
                groundRiskBufferM={study.groundRiskBufferM}
                flyawayBubbleRadiusM={study.flyawayBubbleRadiusM}
                nearbyAerodromes={study.nearbyAerodromes}
              />
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <a
                  href="https://dronesafetymap.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Check live airspace (NATS Drone Safety Map / DroneMap) ↗
                </a>
                <span className="text-slate-500 dark:text-slate-400">
                  Coordinates: {study.lat.toFixed(5)}, {study.lon.toFixed(5)} - paste these into the site search if
                  the map doesn't deep-link directly.
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Red dashed circles are indicative advisory zones around known major aerodromes, not authoritative FRZ
                boundaries. Always confirm live airspace restrictions before flying.
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Operation parameters
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
              Max height AGL (m)
              <input
                type="number"
                value={study.maxHeightAgl}
                onChange={(e) => applyPatchAndRecompute({ maxHeightAgl: Number(e.target.value) })}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label className="flex items-center gap-2 pt-4 text-sm">
              <input
                type="checkbox"
                checked={study.populatedArea}
                onChange={(e) => applyPatchAndRecompute({ populatedArea: e.target.checked })}
              />
              Populated area
            </label>
            <label className="flex items-center gap-2 pt-4 text-sm">
              <input
                type="checkbox"
                checked={study.overCrowds}
                onChange={(e) => applyPatchAndRecompute({ overCrowds: e.target.checked })}
              />
              Assemblies of people nearby
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Operator, flyers & drones
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <h3 className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Operator</h3>
              <select
                value={study.operatorRecordId ?? ''}
                onChange={(e) => onUpdate({ operatorRecordId: e.target.value || null })}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">— None —</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.organisationOrName || o.operatorId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Flyers</h3>
              <div className="space-y-1">
                {flyers.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={study.flyerRecordIds.includes(f.id)}
                      onChange={() => toggleId('flyerRecordIds', f.id)}
                    />
                    {f.name || f.flyerId}
                  </label>
                ))}
                {flyers.length === 0 && <p className="text-xs text-slate-400">No flyers registered.</p>}
              </div>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Drones</h3>
              <div className="space-y-1">
                {drones.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={study.droneRecordIds.includes(d.id)}
                      onChange={() => toggleId('droneRecordIds', d.id)}
                    />
                    {d.manufacturer} {d.model}
                  </label>
                ))}
                {drones.length === 0 && <p className="text-xs text-slate-400">No drones registered.</p>}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ground risk buffer & flyaway calculations
          </h2>
          {study.flyawayBubbleRadiusM === null ? (
            <p className="text-sm text-slate-400">Select at least one drone with a max speed set to calculate this.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <CalcCard label="Ground risk buffer" value={`${study.groundRiskBufferM} m`} />
              <CalcCard label="Worst-case flyaway distance" value={`${study.flyawayDistanceM} m`} />
              <CalcCard label="Total flyaway bubble radius" value={`${study.flyawayBubbleRadiusM} m`} />
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Uses the worst case (largest bubble) of the selected drones. Formula: GRB = 3×V_max + 0.5×max dimension;
            flyaway distance = V_max × 90s response allowance. Template values - verify against your Ops Manual.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Hazard & mitigation log
          </h2>
          <HazardLogEditor
            hazardLog={study.hazardLog}
            context={{
              populatedArea: study.populatedArea,
              overCrowds: study.overCrowds,
              nearAerodrome: study.nearbyAerodromes.length > 0,
              classMarking: drones.find((d) => study.droneRecordIds.includes(d.id))?.classMarking ?? '',
              maxHeightAgl: study.maxHeightAgl,
            }}
            onChange={(log) => onUpdate({ hazardLog: log })}
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Site survey
          </h2>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Left blank by design - complete this in person during the physical site survey.
          </p>
          <textarea
            value={study.siteSurveyNotes}
            onChange={(e) => onUpdate({ siteSurveyNotes: e.target.value })}
            rows={4}
            placeholder="(To be completed on site)"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={study.siteSurveyCompleted}
              onChange={(e) => onUpdate({ siteSurveyCompleted: e.target.checked })}
            />
            Site survey completed
          </label>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Status
          </h2>
          <select
            value={study.status}
            onChange={(e) => onUpdate({ status: e.target.value as FeasibilityStudy['status'] })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="draft">Draft</option>
            <option value="ready-for-survey">Ready for site survey</option>
            <option value="complete">Complete</option>
          </select>
        </section>
      </main>
    </div>
  )
}

function CalcCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-lg font-semibold text-teal-700 dark:text-teal-400">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
