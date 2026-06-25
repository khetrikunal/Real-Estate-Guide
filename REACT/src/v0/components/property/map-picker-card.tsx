"use client"

import { useEffect, useState } from "react"
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react"
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import { estateApi } from "@app/api/estateApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Coordinates = {
  lat: number
  lng: number
}

type MapPickerCardProps = {
  value?: Coordinates
  mapUrl?: string
  onChange?: (coords: Coordinates) => void
  onMapUrlChange?: (url: string) => void
}

const DEFAULT_COORDS: Coordinates = { lat: 18.5204, lng: 73.8567 }
const MAP_MIN_ZOOM = 5
const MAP_MAX_ZOOM = 19
const MAP_NATIVE_ZOOM = 19

const parseCoordinate = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const resolveCoordinates = (value: unknown): Coordinates | null => {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const source = typeof record.data === "object" && record.data ? (record.data as Record<string, unknown>) : record
  const lat = parseCoordinate(source.lat ?? source.latitude, Number.NaN)
  const lng = parseCoordinate(source.lng ?? source.longitude ?? source.lon, Number.NaN)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function MapClickHandler({ onPick }: { onPick: (coords: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      })
    },
  })
  return null
}

function FlyToLocation({ coords }: { coords: Coordinates }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 13), { duration: 0.35 })
  }, [coords.lat, coords.lng, map])
  return null
}

function MapCenterSync({ onPick }: { onPick: (coords: Coordinates) => void }) {
  const map = useMapEvents({
    moveend() {
      const center = map.getCenter()
      onPick({
        lat: Number(center.lat.toFixed(6)),
        lng: Number(center.lng.toFixed(6)),
      })
    },
  })
  return null
}

export function MapPickerCard({ value, mapUrl = "", onChange, onMapUrlChange }: MapPickerCardProps) {
  const [internalMapUrl, setInternalMapUrl] = useState(mapUrl)
  const [internalCoords, setInternalCoords] = useState<Coordinates>(value ?? DEFAULT_COORDS)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coords = value ?? internalCoords
  const currentUrl = onMapUrlChange ? mapUrl : internalMapUrl

  const updateCoords = (next: Coordinates) => {
    setInternalCoords(next)
    onChange?.(next)
  }

  const updateMapUrl = (next: string) => {
    setInternalMapUrl(next)
    onMapUrlChange?.(next)
  }

  const resolveMapUrl = async () => {
    if (!currentUrl.trim()) {
      setError("Paste a Google Maps URL or pick directly on the map.")
      return
    }
    setIsResolving(true)
    setError(null)
    try {
      const resolved = await estateApi.locations.resolveMapUrl(currentUrl.trim())
      const next = resolveCoordinates(resolved)
      if (!next) throw new Error("No coordinates returned for this link")
      updateCoords(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve map URL")
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="border-border bg-muted/20 overflow-hidden rounded-xl border">
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="map-url" className="text-sm font-medium">
            Google Maps link
          </label>
          <Input
            id="map-url"
            value={currentUrl}
            onChange={(event) => updateMapUrl(event.target.value)}
            placeholder="Paste share link, then resolve coordinates"
            className="mt-2 h-10"
          />
        </div>
        <Button type="button" className="self-end gap-1.5" disabled={isResolving} onClick={resolveMapUrl}>
          {isResolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Resolve
        </Button>
      </div>

      <div className="relative h-64 w-full overflow-hidden">
        <span className="absolute left-4 top-4 z-[500] inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm">
          <LocateFixed className="h-3.5 w-3.5 text-primary" />
          Click map to select location
        </span>
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={13}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxNativeZoom={MAP_NATIVE_ZOOM}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={updateCoords} />
          <MapCenterSync onPick={updateCoords} />
          <FlyToLocation coords={coords} />
        </MapContainer>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[650] -translate-x-1/2 -translate-y-full drop-shadow-[0_12px_18px_rgba(59,130,246,0.45)]">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <MapPin className="h-12 w-12 fill-primary text-white" strokeWidth={1.9} />
            <span className="absolute top-[13px] h-4 w-4 rounded-full border-2 border-white bg-background" />
            <span className="absolute top-[18px] h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Latitude</div>
          <div className="font-mono text-sm tabular-nums">{coords.lat.toFixed(6)}</div>
          <input type="hidden" name="latitude" value={coords.lat} />
        </div>
        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Longitude</div>
          <div className="font-mono text-sm tabular-nums">{coords.lng.toFixed(6)}</div>
          <input type="hidden" name="longitude" value={coords.lng} />
        </div>
        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">Zoom limits</div>
          <div className="font-mono text-sm tabular-nums">5-19</div>
        </div>
      </div>
      {error ? <div className="px-4 pb-4 text-xs text-destructive">{error}</div> : null}
    </div>
  )
}
