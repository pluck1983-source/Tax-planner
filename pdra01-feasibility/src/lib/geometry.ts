// Ground risk buffer / flyaway distance calculations.
//
// IMPORTANT: these are template calculations based on the widely-used JARUS
// SORA Annex F approach to ground risk buffer (GRB), adapted for the simpler
// PDRA01 context. They are a reasonable starting point, not a substitute for
// your Operations Manual's approved methodology or the current CAA PDRA01
// document (CAP722 / the published PDRA01 OSC). A suitably qualified person
// must review and, if needed, override every figure this produces before it
// is relied on operationally.
//
// Ground Risk Buffer (GRB):
//   GRB = (3 * Vmax) + (0.5 * largest characteristic dimension)
// where Vmax is the drone's maximum horizontal airspeed (m/s) and the
// "3 seconds" term is a standard reaction/manoeuvre-time allowance used in
// SORA-derived hazard logs.
//
// Worst-case flyaway distance:
//   distance a drone could travel, at max speed, in the time between a
//   flyaway event and the operator executing emergency procedures
//   (flight termination / geofence / battery exhaustion), plus the GRB.
//   flyawayDistance = Vmax * flyawayResponseSeconds
//   flyawayBubbleRadius = flyawayDistance + GRB

export interface GeometryInputs {
  maxSpeedMs: number
  maxDimensionMm: number
  /** Seconds assumed between a flyaway event and effective mitigation (flight termination, RTH, battery exhaustion etc). Default 90s is a conservative template value - confirm against your Ops Manual. */
  flyawayResponseSeconds?: number
}

export interface GeometryResult {
  groundRiskBufferM: number
  flyawayDistanceM: number
  flyawayBubbleRadiusM: number
}

export const DEFAULT_FLYAWAY_RESPONSE_SECONDS = 90

export function calculateGeometry({
  maxSpeedMs,
  maxDimensionMm,
  flyawayResponseSeconds = DEFAULT_FLYAWAY_RESPONSE_SECONDS,
}: GeometryInputs): GeometryResult {
  const maxDimensionM = maxDimensionMm / 1000
  const groundRiskBufferM = 3 * maxSpeedMs + 0.5 * maxDimensionM
  const flyawayDistanceM = maxSpeedMs * flyawayResponseSeconds
  const flyawayBubbleRadiusM = flyawayDistanceM + groundRiskBufferM

  return {
    groundRiskBufferM: round1(groundRiskBufferM),
    flyawayDistanceM: round1(flyawayDistanceM),
    flyawayBubbleRadiusM: round1(flyawayBubbleRadiusM),
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

const EARTH_RADIUS_M = 6371000

export function haversineDistanceM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}
