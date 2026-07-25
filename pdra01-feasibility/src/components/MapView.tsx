import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Aerodrome } from '../lib/types.ts'

// Vite bundles marker images with hashed URLs - point Leaflet's default icon
// at the bundled assets instead of the (broken by default) relative paths.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

interface Props {
  lat: number
  lon: number
  groundRiskBufferM: number | null
  flyawayBubbleRadiusM: number | null
  nearbyAerodromes: Aerodrome[]
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon])
  }, [lat, lon, map])
  return null
}

export default function MapView({ lat, lon, groundRiskBufferM, flyawayBubbleRadiusM, nearbyAerodromes }: Props) {
  return (
    <MapContainer center={[lat, lon]} zoom={14} style={{ height: 420, width: '100%', borderRadius: 8 }}>
      <Recenter lat={lat} lon={lon} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]}>
        <Popup>Site location</Popup>
      </Marker>

      {groundRiskBufferM !== null && (
        <Circle
          center={[lat, lon]}
          radius={groundRiskBufferM}
          pathOptions={{ color: '#0f766e', fillColor: '#0f766e', fillOpacity: 0.15 }}
        >
          <Popup>Ground risk buffer: {groundRiskBufferM} m</Popup>
        </Circle>
      )}

      {flyawayBubbleRadiusM !== null && (
        <Circle
          center={[lat, lon]}
          radius={flyawayBubbleRadiusM}
          pathOptions={{ color: '#b45309', fillColor: '#b45309', fillOpacity: 0.06, dashArray: '6 6' }}
        >
          <Popup>Worst-case flyaway bubble: {flyawayBubbleRadiusM} m</Popup>
        </Circle>
      )}

      {nearbyAerodromes.map((a) => (
        <Circle
          key={a.icao}
          center={[a.lat, a.lon]}
          radius={a.indicativeRadiusM}
          pathOptions={{ color: '#b91c1c', fillColor: '#b91c1c', fillOpacity: 0.05, dashArray: '2 6' }}
        >
          <Popup>
            {a.name} ({a.icao}) - indicative advisory zone only, not an authoritative FRZ boundary. Confirm on NATS
            Drone Assist / DroneMap.
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  )
}
