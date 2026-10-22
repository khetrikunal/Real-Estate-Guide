"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Layers, LocateFixed, MapPin, Minus, Plus, Search } from "lucide-react"
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectsData } from "@/lib/live-data"
import { mediaUrl } from "@/lib/media-url"
import type { Property } from "@/lib/data"
import { PanelTransition, RevealSection, shouldUseAppMotion, startViewTransitionNavigation } from "@app/motion"

const MIN_ZOOM = 5
const MAX_ZOOM = 19
const DEFAULT_ZOOM = 12
const DEFAULT_COORD = { lat: 19.076, lng: 72.8777 }
const MARKER_TONES = [
  "reference-map-pin-tone-1",
  "reference-map-pin-tone-2",
  "reference-map-pin-tone-3",
  "reference-map-pin-tone-4",
  "reference-map-pin-tone-5",
  "reference-map-pin-tone-6",
  "reference-map-pin-tone-7",
  "reference-map-pin-tone-8",
]

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  pune: { lat: 18.5204, lng: 73.8567 },
  baramati: { lat: 18.1517, lng: 74.5777 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  solapur: { lat: 17.6599, lng: 75.9064 },
}

function markerIconFor(projectId: string, tone: string) {
  const safeTone = MARKER_TONES.includes(tone) ? tone : MARKER_TONES[0]
  return L.divIcon({
    className: "reference-map-pin-icon",
    html: `
      <span
        class="reference-map-pin ${safeTone}"
        data-map-marker-id="${escapeAttribute(projectId)}"
        aria-hidden="true"
      >
        <span class="reference-map-pin-core"></span>
      </span>
    `,
    iconSize: [32, 44],
    iconAnchor: [16, 42],
    tooltipAnchor: [0, -34],
  })
}

type RoleParams = { role: string } | Promise<{ role: string }>
type MapLayer = "standard" | "satellite"

function isPromiseParams(params: RoleParams): params is Promise<{ role: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

export default function MapPage({ params }: { params: RoleParams }) {
  const { role } = isPromiseParams(params) ? use(params) : params
  return <MapContent role={role} />
}

function MapContent({ role }: { role: string }) {
  const router = useRouter()
  const { projects, isFetching } = useProjectsData()
  const [query, setQuery] = useState("")
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [layer, setLayer] = useState<MapLayer>("standard")
  const [selectedId, setSelectedId] = useState("")

  const baseMappedProjects = useMemo(
    () =>
      projects.map((project, index) => ({
        project,
        coord: projectCoord(project, index),
        exact: hasExactCoord(project),
        color: MARKER_TONES[index % MARKER_TONES.length],
      })),
    [projects],
  )
  const mappedProjects = useMemo(() => spreadProjectMarkers(baseMappedProjects), [baseMappedProjects])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return mappedProjects
    return mappedProjects.filter(({ project }) =>
      [project.name, project.address, project.city, project.area, project.config]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    )
  }, [mappedProjects, query])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("")
      return
    }
    if (!selectedId || !filtered.some(({ project }) => project.id === selectedId)) {
      setSelectedId(filtered[0].project.id)
    }
  }, [filtered, selectedId])

  const selectedEntry = filtered.find(({ project }) => project.id === selectedId) ?? filtered[0]
  const selected = selectedEntry?.project
  const center = selectedEntry?.coord ?? DEFAULT_COORD
  const selectedProjectHref = selected ? `/${role}/search-property/${selected.id}` : ""
  const selectedTransitionName = selected ? `map-project-${selected.id}` : undefined
  const exactCount = mappedProjects.filter((entry) => entry.exact).length

  const handleMarkerSelect = (projectId: string) => {
    setSelectedId(projectId)
    if (!shouldUseAppMotion()) return
    const marker = document.querySelector(`[data-map-marker-id="${CSS.escape(projectId)}"]`)
    marker?.animate(
      [
        { transform: "translateY(0) scale(1)", opacity: 0.92 },
        { transform: "translateY(-2px) scale(1.08)", opacity: 1 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    )
  }

  const handleViewProject = () => {
    if (!selectedProjectHref) return
    startViewTransitionNavigation(() => router.push(selectedProjectHref))
  }

  return (
    <PageContainer className="max-w-[1560px] py-5">
      <div className="reference-page-panel px-10 py-10">
        <PageHeader
          eyebrow="Map"
          title="Project map"
          description="Browse role-visible projects by location with bounded zoom and quick project access."
          actions={
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/${role}/properties/new`}>
                <MapPin className="h-3.5 w-3.5" />
                Pick location
              </Link>
            </Button>
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <RevealSection>
            <SectionCard
              className="overflow-hidden"
              eyebrow={`${filtered.length} markers`}
              title="Role project locations"
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Zoom out"
                    disabled={zoom <= MIN_ZOOM}
                    onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-16 text-center font-mono text-xs tabular-nums">
                    {zoom} / {MIN_ZOOM}-{MAX_ZOOM}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Zoom in"
                    disabled={zoom >= MAX_ZOOM}
                    onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search project, city, area, or configuration"
                    className="h-10 pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => setLayer((current) => (current === "standard" ? "satellite" : "standard"))}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {layer === "standard" ? "OpenStreetMap" : "Satellite"}
                </Button>
              </div>

              <div className="reference-live-map relative h-[560px] overflow-hidden rounded-xl border border-border">
                <MapContainer
                  center={[center.lat, center.lng]}
                  zoom={zoom}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  scrollWheelZoom
                  className="reference-leaflet-map"
                >
                  <TileLayer
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    maxNativeZoom={18}
                    attribution={
                      layer === "standard"
                        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        : 'Tiles &copy; Esri'
                    }
                    url={
                      layer === "standard"
                        ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    }
                  />
                  <MapView center={center} zoom={zoom} />
                  {filtered.map(({ project, coord, exact, color }) => (
                    <Marker
                      key={project.id}
                      position={[coord.lat, coord.lng]}
                      icon={markerIconFor(project.id, color)}
                      zIndexOffset={1000}
                      eventHandlers={{
                        click: () => handleMarkerSelect(project.id),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -34]} opacity={1}>
                        <MarkerHoverCard project={project} exact={exact} />
                      </Tooltip>
                    </Marker>
                  ))}
                </MapContainer>
                <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm">
                  <LocateFixed className="h-3.5 w-3.5 text-primary" />
                  {layer === "standard" ? "OpenStreetMap" : "Satellite"} · {exactCount}/{projects.length} exact coordinates
                </div>
                {isFetching ? (
                  <div className="absolute bottom-4 left-4 rounded-md border border-border/70 bg-background/90 px-3 py-1.5 text-xs">
                    Refreshing live projects...
                  </div>
                ) : null}
                {!filtered.length ? (
                  <div className="absolute inset-6 flex items-center justify-center rounded-xl border border-dashed border-border bg-background/70 text-sm text-muted-foreground">
                    No project locations match current filters.
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </RevealSection>

          <SectionCard
            eyebrow="Selected marker"
            title={
              selected ? (
                <span style={{ viewTransitionName: selectedTransitionName ? `${selectedTransitionName}-title` : undefined }}>
                  {selected.name}
                </span>
              ) : (
                "No project selected"
              )
            }
          >
            <PanelTransition
              motionKey={selected?.id ?? "no-marker"}
              style={{ viewTransitionName: selectedTransitionName }}
            >
              {selected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="success" dot>
                      {selected.status}
                    </StatusPill>
                    <StatusPill tone="neutral">{selected.config}</StatusPill>
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <Row label="Address" value={selected.address || selected.city} />
                    <Row label="City" value={selected.city} />
                    <Row label="Area" value={selected.area || "-"} />
                    <Row label="Base price" value={selected.price} mono />
                    <Row label="Units" value={`${selected.unitsSold}/${selected.unitsTotal || 1} sold`} mono />
                  </dl>
                  <Button type="button" className="gap-1.5" onClick={handleViewProject}>
                    <Building2 className="h-3.5 w-3.5" />
                    View project
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No project markers match current filters.</div>
              )}
            </PanelTransition>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  )
}

function MapView({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    map.setView([center.lat, center.lng], zoom, { animate: true })
  }, [center.lat, center.lng, map, zoom])
  return null
}

function MarkerHoverCard({ project, exact }: { project: Property; exact: boolean }) {
  const cover = mediaUrl(project.cover)
  return (
    <div className="reference-map-hover-card">
      <div className="reference-map-hover-media">
        {cover ? <img src={cover} alt="" /> : <Building2 className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{project.name}</div>
        <div className="line-clamp-2 text-xs text-muted-foreground">{project.address || [project.city, project.area].filter(Boolean).join(" · ")}</div>
        {!exact ? <div className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">City fallback</div> : null}
      </div>
    </div>
  )
}

function projectCoord(property: Property, index = 0) {
  if (hasExactCoord(property)) {
    return { lat: Number(property.latitude), lng: Number(property.longitude) }
  }
  const base = CITY_COORDS[property.city.toLowerCase()] ?? DEFAULT_COORD
  const seed = [...property.id].reduce((sum, char) => sum + char.charCodeAt(0), index * 11)
  return {
    lat: base.lat + ((seed % 17) - 8) * 0.018,
    lng: base.lng + (((seed * 3) % 17) - 8) * 0.018,
  }
}

function spreadProjectMarkers<T extends { coord: { lat: number; lng: number }; color: string }>(entries: T[]): T[] {
  const buckets = new Map<string, T[]>()
  entries.forEach((entry) => {
    const key = `${Math.round(entry.coord.lat * 1000)}:${Math.round(entry.coord.lng * 1000)}`
    const bucket = buckets.get(key) ?? []
    bucket.push(entry)
    buckets.set(key, bucket)
  })

  return entries.map((entry) => {
    const key = `${Math.round(entry.coord.lat * 1000)}:${Math.round(entry.coord.lng * 1000)}`
    const bucket = buckets.get(key) ?? [entry]
    if (bucket.length <= 1) return entry

    const index = bucket.indexOf(entry)
    const angle = (Math.PI * 2 * index) / bucket.length
    const radius = 0.0014 + Math.floor(index / MARKER_TONES.length) * 0.00055
    return {
      ...entry,
      coord: {
        lat: entry.coord.lat + Math.sin(angle) * radius,
        lng: entry.coord.lng + Math.cos(angle) * radius,
      },
      color: MARKER_TONES[index % MARKER_TONES.length],
    }
  })
}

function hasExactCoord(property: Property) {
  const lat = Number(property.latitude)
  const lng = Number(property.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs tabular-nums" : "font-medium"}>{value}</dd>
    </div>
  )
}
