import type { Drone, FeasibilityStudy, Flyer, Operator } from './types.ts'

const KEYS = {
  operators: 'pdra01.operators',
  flyers: 'pdra01.flyers',
  drones: 'pdra01.drones',
  studies: 'pdra01.studies',
} as const

function load<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

function save<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export const store = {
  loadOperators: () => load<Operator>(KEYS.operators),
  saveOperators: (items: Operator[]) => save(KEYS.operators, items),

  loadFlyers: () => load<Flyer>(KEYS.flyers),
  saveFlyers: (items: Flyer[]) => save(KEYS.flyers, items),

  loadDrones: () => load<Drone>(KEYS.drones),
  saveDrones: (items: Drone[]) => save(KEYS.drones, items),

  loadStudies: () => load<FeasibilityStudy>(KEYS.studies),
  saveStudies: (items: FeasibilityStudy[]) => save(KEYS.studies, items),
}

export function exportAllData(): string {
  return JSON.stringify(
    {
      operators: store.loadOperators(),
      flyers: store.loadFlyers(),
      drones: store.loadDrones(),
      studies: store.loadStudies(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )
}

export function importAllData(json: string): void {
  const parsed = JSON.parse(json)
  if (parsed.operators) store.saveOperators(parsed.operators)
  if (parsed.flyers) store.saveFlyers(parsed.flyers)
  if (parsed.drones) store.saveDrones(parsed.drones)
  if (parsed.studies) store.saveStudies(parsed.studies)
}
