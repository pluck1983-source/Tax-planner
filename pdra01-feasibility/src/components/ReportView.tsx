import type { Drone, FeasibilityStudy, Flyer, Operator } from '../lib/types.ts'
import { expiryLabel } from '../lib/expiry.ts'

interface Props {
  study: FeasibilityStudy
  operator: Operator | null
  flyers: Flyer[]
  drones: Drone[]
  onBack: () => void
}

export default function ReportView({ study, operator, flyers, drones, onBack }: Props) {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="no-print sticky top-0 flex justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <button onClick={onBack} className="text-sm text-teal-700 hover:underline dark:text-teal-400">
          ← Back to study
        </button>
        <button
          onClick={() => window.print()}
          className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Print / save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 print:px-0">
        <header>
          <h1 className="text-2xl font-bold">PDRA01 Site Feasibility Study</h1>
          <p className="text-slate-500 dark:text-slate-400">{study.title}</p>
          <p className="text-xs text-slate-400">
            Generated {new Date().toLocaleString('en-GB')} · Study status: {study.status}
          </p>
        </header>

        <Section title="1. Operator">
          {operator ? (
            <KeyValueTable
              rows={[
                ['Organisation / name', operator.organisationOrName],
                ['Operator ID', operator.operatorId],
                ['Registration renewal', `${operator.registrationExpiry || '—'} (${expiryLabel(operator.registrationExpiry)})`],
              ]}
            />
          ) : (
            <Empty text="No operator linked to this study." />
          )}
        </Section>

        <Section title="2. Remote pilots (flyers)">
          {flyers.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th className="py-1 pr-2">Name</th>
                  <th className="py-1 pr-2">Flyer ID</th>
                  <th className="py-1">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {flyers.map((f) => (
                  <tr key={f.id} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-1 pr-2">{f.name}</td>
                    <td className="py-1 pr-2">{f.flyerId}</td>
                    <td className="py-1">
                      {f.expiryDate} ({expiryLabel(f.expiryDate)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No flyers linked to this study." />
          )}
        </Section>

        <Section title="3. Aircraft & controllers">
          {drones.length > 0 ? (
            <div className="space-y-2">
              {drones.map((d) => (
                <KeyValueTable
                  key={d.id}
                  rows={[
                    ['Manufacturer / model', `${d.manufacturer} ${d.model}`],
                    ['Class marking', d.classMarking === 'none' ? 'None / legacy (unmarked)' : d.classMarking],
                    ['Drone serial number', d.serialNumber],
                    ['Controller serial number', d.controllerSerialNumber],
                    ['MTOM', `${d.mtomKg} kg`],
                    ['Max characteristic dimension', `${d.maxDimensionMm} mm`],
                    ['Max horizontal speed', `${d.maxSpeedMs} m/s`],
                    ['Remote ID', d.hasRemoteId ? 'Yes' : 'No'],
                  ]}
                />
              ))}
            </div>
          ) : (
            <Empty text="No drones linked to this study." />
          )}
        </Section>

        <Section title="4. Site">
          <KeyValueTable
            rows={[
              ['Address', study.address || '—'],
              ['what3words', study.what3words || '—'],
              ['Coordinates', study.lat !== null && study.lon !== null ? `${study.lat}, ${study.lon}` : '—'],
              ['Maximum height AGL', `${study.maxHeightAgl} m`],
              ['Populated area', study.populatedArea ? 'Yes' : 'No'],
              ['Assemblies of people nearby', study.overCrowds ? 'Yes' : 'No'],
            ]}
          />
        </Section>

        <Section title="5. Airspace assessment">
          {study.nearbyAerodromes.length > 0 ? (
            <>
              <p className="mb-2 text-sm">Aerodromes within 20 km of the site (indicative only):</p>
              <ul className="list-inside list-disc text-sm">
                {study.nearbyAerodromes.map((a) => (
                  <li key={a.icao}>
                    {a.name} ({a.icao})
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm">No known major aerodromes within 20 km of the site.</p>
          )}
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            This is not an authoritative airspace check. Live airspace, FRZ boundaries, NOTAMs and any required
            aerodrome coordination must be confirmed on NATS Drone Safety Map / DroneMap immediately before the site
            survey and again before flight.
          </p>
        </Section>

        <Section title="6. Ground risk buffer & flyaway calculations">
          {study.flyawayBubbleRadiusM !== null ? (
            <KeyValueTable
              rows={[
                ['Ground risk buffer', `${study.groundRiskBufferM} m`],
                ['Worst-case flyaway distance', `${study.flyawayDistanceM} m`],
                ['Total flyaway bubble radius', `${study.flyawayBubbleRadiusM} m`],
              ]}
            />
          ) : (
            <Empty text="No calculation available - no drone with speed/dimension data linked." />
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Template calculation (GRB = 3×V_max + 0.5×max dimension; flyaway distance = V_max × 90s response
            allowance), based on the worst-case selected aircraft. Verify against the operator's Operations Manual
            and the current CAA PDRA01 document before relying on these figures.
          </p>
        </Section>

        <Section title="7. Hazard & mitigation log">
          {study.hazardLog.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left align-top dark:border-slate-700">
                  <th className="py-1 pr-2">Hazard</th>
                  <th className="py-1 pr-2">Cause</th>
                  <th className="py-1 pr-2">Effect</th>
                  <th className="py-1 pr-2">Initial</th>
                  <th className="py-1 pr-2">Mitigations</th>
                  <th className="py-1">Residual</th>
                </tr>
              </thead>
              <tbody>
                {study.hazardLog.map((h) => (
                  <tr key={h.id} className="border-b border-slate-200 align-top dark:border-slate-800">
                    <td className="py-1 pr-2">{h.hazard}</td>
                    <td className="py-1 pr-2">{h.cause}</td>
                    <td className="py-1 pr-2">{h.effect}</td>
                    <td className="py-1 pr-2">{h.initialRisk}</td>
                    <td className="py-1 pr-2">
                      <ul className="list-inside list-disc">
                        {h.mitigations.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-1">{h.residualRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No hazards recorded." />
          )}
        </Section>

        <Section title="8. Site survey">
          <p className="rounded border border-slate-300 border-dashed p-3 text-sm italic text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {study.siteSurveyNotes || 'To be completed following the physical site survey.'}
          </p>
          <p className="mt-2 text-sm">
            Site survey completed: <strong>{study.siteSurveyCompleted ? 'Yes' : 'No'}</strong>
          </p>
        </Section>

        <Section title="9. Sign-off">
          <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
            <div className="border-t border-slate-400 pt-1">Remote pilot signature / date</div>
            <div className="border-t border-slate-400 pt-1">Accountable manager signature / date</div>
          </div>
        </Section>

        <footer className="border-t border-slate-300 pt-3 text-xs text-slate-400 dark:border-slate-700">
          This document is generated from operator-entered data and template hazard/mitigation content. It does not
          constitute CAA-approved guidance and must be reviewed by a suitably qualified person against the current
          Operations Manual and the published PDRA01 document before use.
        </footer>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400">{text}</p>
}

function KeyValueTable({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
