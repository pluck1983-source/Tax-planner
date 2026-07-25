// Core domain types for the PDRA01 feasibility system.
// PDRA01 = CAA "Pre-Defined Risk Assessment 01", one of the standard
// Operational Authorisation risk assessments in the UK Specific Category.

export type ClassMarking = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'none'

export interface Drone {
  id: string
  manufacturer: string
  model: string
  serialNumber: string
  controllerSerialNumber: string
  classMarking: ClassMarking
  mtomKg: number // maximum take-off mass
  maxDimensionMm: number // largest characteristic dimension (diagonal, rotor tip to tip)
  maxSpeedMs: number // manufacturer max horizontal airspeed, m/s
  hasRemoteId: boolean
  hasCamera: boolean
  notes: string
}

export interface Operator {
  id: string
  organisationOrName: string
  operatorId: string // e.g. GBR-OP-XXXXXXXXXXXX
  registrationExpiry: string // ISO date
}

export interface Flyer {
  id: string
  name: string
  flyerId: string // e.g. GBR-FLY-XXXXXXXXXXXX
  testPassDate: string // ISO date
  expiryDate: string // ISO date
}

export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface HazardEntry {
  id: string
  category: string
  hazard: string
  cause: string
  effect: string
  initialRisk: RiskLevel
  mitigations: string[]
  residualRisk: RiskLevel
  isCustom: boolean
}

export interface Aerodrome {
  icao: string
  name: string
  lat: number
  lon: number
  // Indicative advisory-only radius (m) - NOT an authoritative FRZ boundary.
  // Real FRZ/ATZ geometry must be confirmed on NATS Drone Assist / DroneMap.
  indicativeRadiusM: number
}

export interface FeasibilityStudy {
  id: string
  title: string
  createdAt: string
  updatedAt: string

  // Location
  address: string
  what3words: string
  lat: number | null
  lon: number | null

  // Linked people/equipment
  operatorRecordId: string | null
  flyerRecordIds: string[]
  droneRecordIds: string[]

  // Operation parameters
  maxHeightAgl: number // metres
  populatedArea: boolean
  overCrowds: boolean

  // Computed (see lib/geometry.ts)
  groundRiskBufferM: number | null
  flyawayDistanceM: number | null
  flyawayBubbleRadiusM: number | null

  nearbyAerodromes: Aerodrome[]

  hazardLog: HazardEntry[]

  // Deliberately left for manual completion on-site - never auto-filled.
  siteSurveyNotes: string
  siteSurveyCompleted: boolean

  status: 'draft' | 'ready-for-survey' | 'complete'
}
