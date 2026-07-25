import type { Aerodrome } from '../lib/types.ts'

// A small static reference list of major UK aerodromes (public facts:
// ICAO code, name, approximate reference point). indicativeRadiusM is a
// generic advisory-only distance and is NOT an authoritative FRZ/ATZ
// boundary - actual protected zones vary per aerodrome and are published by
// the CAA / NATS. Always confirm the real boundary on NATS Drone Assist or
// DroneMap before planning a flight near any aerodrome.
export const KNOWN_AERODROMES: Aerodrome[] = [
  { icao: 'EGLL', name: 'London Heathrow', lat: 51.4700, lon: -0.4543, indicativeRadiusM: 5000 },
  { icao: 'EGKK', name: 'London Gatwick', lat: 51.1481, lon: -0.1903, indicativeRadiusM: 5000 },
  { icao: 'EGSS', name: 'London Stansted', lat: 51.8860, lon: 0.2389, indicativeRadiusM: 5000 },
  { icao: 'EGGW', name: 'London Luton', lat: 51.8747, lon: -0.3683, indicativeRadiusM: 5000 },
  { icao: 'EGLC', name: 'London City', lat: 51.5053, lon: 0.0553, indicativeRadiusM: 5000 },
  { icao: 'EGCC', name: 'Manchester', lat: 53.3537, lon: -2.2750, indicativeRadiusM: 5000 },
  { icao: 'EGBB', name: 'Birmingham', lat: 52.4539, lon: -1.7480, indicativeRadiusM: 5000 },
  { icao: 'EGPH', name: 'Edinburgh', lat: 55.9500, lon: -3.3725, indicativeRadiusM: 5000 },
  { icao: 'EGPF', name: 'Glasgow', lat: 55.8719, lon: -4.4331, indicativeRadiusM: 5000 },
  { icao: 'EGGD', name: 'Bristol', lat: 51.3827, lon: -2.7191, indicativeRadiusM: 5000 },
  { icao: 'EGNX', name: 'East Midlands', lat: 52.8311, lon: -1.3281, indicativeRadiusM: 5000 },
  { icao: 'EGNT', name: 'Newcastle', lat: 55.0375, lon: -1.6917, indicativeRadiusM: 5000 },
  { icao: 'EGNM', name: 'Leeds Bradford', lat: 53.8659, lon: -1.6606, indicativeRadiusM: 5000 },
  { icao: 'EGPD', name: 'Aberdeen', lat: 57.2019, lon: -2.1978, indicativeRadiusM: 5000 },
  { icao: 'EGHI', name: 'Southampton', lat: 50.9503, lon: -1.3568, indicativeRadiusM: 5000 },
  { icao: 'EGHQ', name: 'Newquay', lat: 50.4406, lon: -4.9954, indicativeRadiusM: 5000 },
  { icao: 'EGAA', name: 'Belfast International', lat: 54.6575, lon: -6.2158, indicativeRadiusM: 5000 },
  { icao: 'EGAC', name: 'Belfast City', lat: 54.6181, lon: -5.8725, indicativeRadiusM: 5000 },
  { icao: 'EGFF', name: 'Cardiff', lat: 51.3967, lon: -3.3433, indicativeRadiusM: 5000 },
  { icao: 'EGSH', name: 'Norwich', lat: 52.6758, lon: 1.2828, indicativeRadiusM: 5000 },
  { icao: 'EGLF', name: 'Farnborough', lat: 51.2758, lon: -0.7761, indicativeRadiusM: 5000 },
  { icao: 'EGKB', name: 'Biggin Hill', lat: 51.3308, lon: 0.0325, indicativeRadiusM: 3000 },
  { icao: 'EGTB', name: 'Wycombe Air Park', lat: 51.6106, lon: -0.8078, indicativeRadiusM: 3000 },
  { icao: 'EGLK', name: 'Blackbushe', lat: 51.3238, lon: -0.8478, indicativeRadiusM: 3000 },
  { icao: 'EGSG', name: 'Stapleford', lat: 51.6486, lon: 0.1544, indicativeRadiusM: 3000 },
]

const SEARCH_RADIUS_M = 20000

export function findNearbyAerodromes(lat: number, lon: number, radiusM = SEARCH_RADIUS_M): Aerodrome[] {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000
  return KNOWN_AERODROMES.filter((a) => {
    const dLat = toRad(a.lat - lat)
    const dLon = toRad(a.lon - lon)
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(a.lat)) * Math.sin(dLon / 2) ** 2
    const distance = 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    return distance <= radiusM
  }).sort((a, b) => {
    const da = (a.lat - lat) ** 2 + (a.lon - lon) ** 2
    const db = (b.lat - lat) ** 2 + (b.lon - lon) ** 2
    return da - db
  })
}
