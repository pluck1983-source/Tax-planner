import type { HazardEntry } from '../lib/types.ts'

// Template hazard & mitigation library for a PDRA01-style VLOS operation.
// This mirrors the structure and common content of hazard logs published
// alongside CAA Operational Authorisations, but it is a starting template,
// NOT the authoritative PDRA01 document. A suitably qualified person within
// the operator must review, tailor and approve every entry - and check it
// against the current published PDRA01 OSC/hazard log on the CAA website -
// before it is used to support an operation.

export interface HazardTemplate extends Omit<HazardEntry, 'id' | 'isCustom'> {
  key: string
  appliesWhen?: (ctx: HazardContext) => boolean
}

export interface HazardContext {
  populatedArea: boolean
  overCrowds: boolean
  nearAerodrome: boolean
  classMarking: string
  maxHeightAgl: number
}

export const HAZARD_LIBRARY: HazardTemplate[] = [
  {
    key: 'loss-of-c2-link',
    category: 'Loss of control',
    hazard: 'Loss of command and control (C2) link / flyaway',
    cause: 'RF interference, range exceeded, controller/receiver fault, battery failure in link hardware',
    effect: 'Uncontrolled flight away from the operating area, potential collision with people, property or other aircraft',
    initialRisk: 'High',
    mitigations: [
      'Return-to-home (RTH) and/or automatic landing failsafe configured and flight-tested before operations begin',
      'Operating area sized so the calculated ground risk buffer and flyaway bubble stay within surveyed, controllable ground',
      'Pre-flight RF/interference check of the operating site',
      'Crew briefed on manual recovery / flight termination procedure',
    ],
    residualRisk: 'Medium',
  },
  {
    key: 'loss-of-vlos',
    category: 'Loss of control',
    hazard: 'Loss of visual line of sight',
    cause: 'Obstruction (buildings, trees, terrain), distance, weather (fog/low sun/glare), remote pilot distraction',
    effect: 'Pilot unable to see and avoid other airspace users, people or obstacles',
    initialRisk: 'Medium',
    mitigations: [
      'Operating area chosen with a clear, unobstructed view of the whole flight volume',
      'Maximum operating distance kept within confirmed VLOS range for the drone/pilot',
      'Observer used where a single pilot cannot maintain VLOS over the full area',
      'Flight suspended if visibility deteriorates below planning minima',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'battery-power-failure',
    category: 'Technical failure',
    hazard: 'Battery or power system failure',
    cause: 'Cell degradation, incorrect charging, cold weather performance loss, damaged battery',
    effect: 'Loss of thrust / uncontrolled descent',
    initialRisk: 'Medium',
    mitigations: [
      'Pre-flight battery inspection and voltage check per manufacturer checklist',
      'Batteries stored, charged and transported per manufacturer guidance',
      'Low-battery RTH/land failsafe configured with adequate margin',
      'Flight time planned well within manufacturer-rated endurance',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'gnss-degradation',
    category: 'Technical failure',
    hazard: 'GNSS/GPS signal loss or degradation',
    cause: 'Multipath near buildings, solar activity, jamming/spoofing, poor satellite geometry',
    effect: 'Position-hold drift, inaccurate RTH point, erratic flight in GPS-dependent flight modes',
    initialRisk: 'Medium',
    mitigations: [
      'Home point confirmed and GNSS lock verified (min satellite count) before take-off',
      'Pilot competent in manual/attitude-mode flight as a fallback',
      'Flight suspended if GNSS quality indicator is degraded pre-flight',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'adverse-weather',
    category: 'Environmental',
    hazard: 'Adverse weather (wind, rain, temperature)',
    cause: 'Conditions exceeding manufacturer-rated limits at time of flight',
    effect: 'Reduced control authority, structural stress, reduced battery performance, loss of control',
    initialRisk: 'Medium',
    mitigations: [
      'Weather checked against manufacturer operating limits immediately before flight',
      'Go/no-go weather minima set in the Operations Manual and briefed to the crew',
      'Flight aborted if conditions deteriorate beyond limits during the sortie',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'third-party-ground-risk',
    category: 'Ground risk',
    hazard: 'Collision with, or injury to, an uninvolved third party on the ground',
    cause: 'Loss of control, flyaway, structural failure, member of public entering the flight area',
    effect: 'Injury to a member of the public, property damage',
    initialRisk: 'High',
    mitigations: [
      'Ground risk buffer calculated from drone performance data and enforced as a minimum stand-off from uninvolved persons',
      'Site cordoned/signed and non-essential persons excluded from the flight area and ground risk buffer',
      'Flight not commenced/continued if an uninvolved person enters the ground risk buffer',
      'Operation planned to remain clear of assemblies of people at all times',
    ],
    residualRisk: 'Medium',
  },
  {
    key: 'crowd-proximity',
    category: 'Ground risk',
    hazard: 'Flight over or near an assembly of people',
    cause: 'Site adjoins a crowded place, public event nearby, unplanned gathering',
    effect: 'Elevated ground risk / breach of operating authorisation conditions',
    initialRisk: 'High',
    mitigations: [
      'Site survey confirms no assembly of people within the flyaway bubble',
      'Flight plan and timing chosen to avoid known events/peak footfall',
      'Operation stopped if a crowd forms within the operating or contingency volume',
    ],
    residualRisk: 'Medium',
    appliesWhen: (ctx) => ctx.overCrowds,
  },
  {
    key: 'populated-area',
    category: 'Ground risk',
    hazard: 'Operation within or adjacent to a populated area',
    cause: 'Site is in/near residential, commercial or otherwise populated ground',
    effect: 'Increased likelihood of uninvolved persons within the ground risk buffer',
    initialRisk: 'Medium',
    mitigations: [
      'Ground risk buffer and flyaway bubble mapped against the site and kept clear of occupied buildings/gardens where practicable',
      'Flight height and route chosen to minimise overflight of uninvolved persons',
      'Neighbours/site occupants notified in advance where appropriate',
    ],
    residualRisk: 'Low',
    appliesWhen: (ctx) => ctx.populatedArea,
  },
  {
    key: 'airspace-infringement',
    category: 'Airspace',
    hazard: 'Infringement of controlled airspace, an FRZ, or another restriction',
    cause: 'Site is within or close to an aerodrome Flight Restriction Zone or other notified restriction',
    effect: 'Conflict with manned aircraft, breach of Air Navigation Order restrictions',
    initialRisk: 'High',
    mitigations: [
      'Current airspace checked on NATS Drone Assist and/or DroneMap immediately before the site survey and again before flight',
      'Permission/coordination obtained from the relevant Air Navigation Service Provider or aerodrome if the site falls within an FRZ',
      'Maximum height limited to remain clear of any notified restriction',
      'NOTAMs checked for temporary restrictions on the day of flight',
    ],
    residualRisk: 'Medium',
    appliesWhen: (ctx) => ctx.nearAerodrome,
  },
  {
    key: 'other-airspace-users',
    category: 'Airspace',
    hazard: 'Conflict with other airspace users (manned aircraft, other UAS)',
    cause: 'Low-flying manned aircraft (e.g. police, air ambulance, agricultural), other drone operators sharing the area',
    effect: 'Mid-air collision risk',
    initialRisk: 'Medium',
    mitigations: [
      'Continuous visual scan for other airspace users maintained throughout the flight',
      'Operating height kept as low as practicable for the task, and below the authorised maximum',
      'Flight suspended and the drone landed if a manned aircraft is seen approaching the operating area',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'max-height-limit',
    category: 'Airspace',
    hazard: 'Unintended climb above the planned/authorised maximum height',
    cause: 'Pilot input error, terrain-following miscalculation, software fault',
    effect: 'Breach of the 400ft (120m) AGL general limit or a lower site-specific limit, increased airspace conflict risk',
    initialRisk: 'Medium',
    mitigations: [
      'Software altitude limiter set to the planned maximum height before take-off',
      'Pilot briefed on the authorised maximum height for the site',
    ],
    residualRisk: 'Low',
    appliesWhen: (ctx) => ctx.maxHeightAgl > 0,
  },
  {
    key: 'structural-failure',
    category: 'Technical failure',
    hazard: 'In-flight structural or component failure (propeller, motor, arm)',
    cause: 'Fatigue, prior undetected damage, manufacturing defect, bird/foreign object strike',
    effect: 'Loss of control, uncontrolled descent',
    initialRisk: 'Medium',
    mitigations: [
      'Pre-flight physical inspection of airframe, propellers and mounting points per manufacturer checklist',
      'Damaged components replaced before flight rather than repaired ad hoc',
      'Drone maintained and stored in line with manufacturer guidance',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'bird-strike',
    category: 'Environmental',
    hazard: 'Bird strike / wildlife interaction',
    cause: 'Operating near nesting sites, flocks, birds of prey investigating/attacking the drone',
    effect: 'Structural damage, loss of control',
    initialRisk: 'Low',
    mitigations: [
      'Site survey checks for nearby nesting sites or known bird activity',
      'Flight aborted/relocated if birds show interest in or approach the drone',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'ground-crew-conflict',
    category: 'Human factors',
    hazard: 'Ground crew or bystander walks into the operating area',
    cause: 'Inadequate cordon/signage, public curiosity, site not fully controlled (e.g. public right of way)',
    effect: 'Injury from rotors, distraction to pilot',
    initialRisk: 'Medium',
    mitigations: [
      'Operating area cordoned and signed; observer/ground crew used to manage bystanders where the site cannot be fully secured',
      'Public rights of way or shared access identified in the site survey and managed accordingly',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'pilot-incapacitation',
    category: 'Human factors',
    hazard: 'Remote pilot incapacitation or distraction during flight',
    cause: 'Medical event, environmental distraction, fatigue',
    effect: 'Loss of positive control',
    initialRisk: 'Low',
    mitigations: [
      'RTH/failsafe configured so the aircraft returns/lands automatically if controls are released',
      'Observer present for higher-risk operations to call out hazards and support the pilot',
      'Pilot fitness-to-fly (fatigue, medication, alcohol) self-assessed before every flight',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'data-privacy',
    category: 'Other',
    hazard: 'Unintended capture of personal data / privacy breach',
    cause: 'Camera-equipped drone overflying private property or individuals outside the survey scope',
    effect: 'Breach of privacy, data protection non-compliance',
    initialRisk: 'Low',
    mitigations: [
      'Camera/gimbal angle and flight path planned to minimise overflight of private property not part of the survey',
      'Data handled per the operator\'s privacy policy and, where applicable, UK GDPR',
    ],
    residualRisk: 'Low',
  },
  {
    key: 'legacy-class-marking',
    category: 'Airspace',
    hazard: 'Drone has no UK/EU class marking (legacy aircraft)',
    cause: 'Aircraft purchased before class-marked stock was required, or imported without a class mark',
    effect: 'Additional operational restrictions may apply to distance from uninvolved people/assemblies compared with class-marked aircraft',
    initialRisk: 'Medium',
    mitigations: [
      'Operation planned to the more conservative distances applicable to unmarked/legacy aircraft in the current CAA guidance',
      'Confirm current legacy-aircraft transitional arrangements on the CAA website before relying on this aircraft for the operation',
    ],
    residualRisk: 'Low',
    appliesWhen: (ctx) => ctx.classMarking === 'none',
  },
]

export function suggestHazards(ctx: HazardContext): HazardTemplate[] {
  return HAZARD_LIBRARY.filter((h) => !h.appliesWhen || h.appliesWhen(ctx))
}
