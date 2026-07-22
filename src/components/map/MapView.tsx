'use client'

import { useEffect, useState } from 'react'
import {
  MapContainer, TileLayer, Marker, Circle, Popup, useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix leaflet default icon issue in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const studentIcon = L.divIcon({
  html: `<div style="
    width: 24px; height: 24px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    position: relative;
  ">
    <div style="
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #3b82f6;
    "></div>
  </div>`,
  iconSize: [24, 32],
  iconAnchor: [12, 32],
  popupAnchor: [0, -32],
  className: '',
})

const schoolIcon = L.divIcon({
  html: `<div style="
    width: 28px; height: 28px;
    background: #10b981;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: bold;
  ">S</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
  className: '',
})

L.Marker.prototype.options.icon = defaultIcon

interface GeoFence {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
}

interface UserLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

interface MapViewProps {
  userLocation?: UserLocation | null
  geofences?: GeoFence[]
  center?: [number, number]
  zoom?: number
  className?: string
  showAccuracyCircle?: boolean
  onLocationSelect?: (lat: number, lng: number) => void
  pickMode?: boolean
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    function handleClick(e: L.LeafletMouseEvent) {
      onClick(e.latlng.lat, e.latlng.lng)
    }
    map.on('click', handleClick)
    return () => { map.off('click', handleClick) }
  }, [map, onClick])
  return null
}

export default function MapView({
  userLocation,
  geofences = [],
  center,
  zoom = 16,
  className = '',
  showAccuracyCircle = true,
  onLocationSelect,
  pickMode = false,
}: MapViewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-sm text-muted-foreground">Memuat peta...</p>
      </div>
    )
  }

  const mapCenter: [number, number] = center
    || (userLocation ? [userLocation.latitude, userLocation.longitude] : [-6.2, 106.8])
  const mapZoom = userLocation ? zoom : 12

  return (
    <div className={`relative rounded-lg overflow-hidden border ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <>
            <RecenterMap center={[userLocation.latitude, userLocation.longitude]} />
            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={studentIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-sm">Lokasi Anda</p>
                  <p className="text-xs text-gray-500">
                    {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  </p>
                  {userLocation.accuracy && (
                    <p className="text-xs text-gray-400">
                      Akurasi: ±{Math.round(userLocation.accuracy)}m
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            {showAccuracyCircle && userLocation.accuracy && (
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={userLocation.accuracy}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '5, 5',
                }}
              />
            )}
          </>
        )}

        {geofences.map((fence) => (
          <div key={fence.id}>
            <Circle
              center={[fence.latitude, fence.longitude]}
              radius={fence.radius}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
            <Marker position={[fence.latitude, fence.longitude]} icon={schoolIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-sm">{fence.name}</p>
                  <p className="text-xs text-gray-500">
                    Radius: {fence.radius}m
                  </p>
                  <p className="text-xs text-gray-400">
                    {fence.latitude.toFixed(6)}, {fence.longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}

        {pickMode && onLocationSelect && (
          <ClickHandler onClick={onLocationSelect} />
        )}
      </MapContainer>
    </div>
  )
}
