import type { Drone, FeasibilityStudy } from './types.ts'
import { calculateGeometry } from './geometry.ts'
import { findNearbyAerodromes } from '../data/aerodromes.ts'

// Combines the selected drones' worst-case geometry (largest bubble wins,
// since the feasibility study must plan for the least favourable aircraft
// that might fly) and refreshes the nearby-aerodrome list for the site.
export function recomputeStudy(
  study: FeasibilityStudy,
  allDrones: Drone[],
): Pick<
  FeasibilityStudy,
  'groundRiskBufferM' | 'flyawayDistanceM' | 'flyawayBubbleRadiusM' | 'nearbyAerodromes'
> {
  const selected = allDrones.filter((d) => study.droneRecordIds.includes(d.id))

  let groundRiskBufferM: number | null = null
  let flyawayDistanceM: number | null = null
  let flyawayBubbleRadiusM: number | null = null

  for (const d of selected) {
    if (!d.maxSpeedMs) continue
    const g = calculateGeometry({ maxSpeedMs: d.maxSpeedMs, maxDimensionMm: d.maxDimensionMm })
    if (flyawayBubbleRadiusM === null || g.flyawayBubbleRadiusM > flyawayBubbleRadiusM) {
      groundRiskBufferM = g.groundRiskBufferM
      flyawayDistanceM = g.flyawayDistanceM
      flyawayBubbleRadiusM = g.flyawayBubbleRadiusM
    }
  }

  const nearbyAerodromes =
    study.lat !== null && study.lon !== null ? findNearbyAerodromes(study.lat, study.lon) : []

  return { groundRiskBufferM, flyawayDistanceM, flyawayBubbleRadiusM, nearbyAerodromes }
}
