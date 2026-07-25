# PDRA01 Feasibility

A browser-based tool for building UK CAA PDRA01-style drone site feasibility
studies: operator/flyer ID tracking with renewal alerts, a drone & controller
registry, what3words/lat-lon site location, ground risk buffer & flyaway
distance mapping, nearby-aerodrome context, and an auto-populated hazard &
mitigation log. The site survey section is always left blank for manual,
on-site completion.

**This is not a substitute for CAA-approved procedures.** All calculated
figures, hazard log entries and airspace context are templates that must be
reviewed by a suitably qualified person against the operator's Operations
Manual and the current published PDRA01 document before being relied on.

## Features

- **Operator & Flyer IDs** - record CAA Operator ID and Flyer ID(s) with
  expiry dates; the dashboard flags anything expired or due for renewal
  within 60 days.
- **Drone & controller registry** - manufacturer, model, serial numbers,
  class marking, MTOM, max dimension and max speed. This manufacturer data
  drives the survey calculations.
- **Feasibility studies** - one per site:
  - Address and/or what3words location (resolved via the what3words API),
    or manual lat/lon entry.
  - Map (Leaflet + OpenStreetMap) showing the ground risk buffer and
    worst-case flyaway bubble as circles around the site, plus known major
    UK aerodromes nearby with an indicative advisory zone and a deep-link
    to check live airspace on the NATS Drone Safety Map / DroneMap.
  - Ground risk buffer / flyaway distance, calculated from the selected
    drone's manufacturer data.
  - An editable hazard & mitigation log, auto-suggested from a built-in
    template library based on the site's attributes.
  - A site survey section left blank for on-site completion.
  - A printable report assembling all of the above.

## Getting started

```bash
npm install
cp .env.example .env   # add a what3words API key (optional - see below)
npm run dev
```

### what3words

Sign up for a free API key at https://developer.what3words.com/ and set it
as `VITE_WHAT3WORDS_API_KEY` in `.env`. Without a key, the app still works
fully via manual lat/lon entry.

### Airspace data

There is no free public API for live FRZ/airspace boundaries (NATS Drone
Safety Map / DroneMap don't offer one for third-party apps - that data is
generally only available under a commercial licence, e.g. via Altitude
Angel). The map instead shows OpenStreetMap tiles plus a small static list
of major UK aerodromes with an indicative advisory radius, and links out to
the live map for an authoritative check. Always confirm current airspace
restrictions before flying.

## Data storage

All data is stored locally in the browser (`localStorage`). Use the
Export/Import buttons in the header to back up or move data between
devices/browsers.
