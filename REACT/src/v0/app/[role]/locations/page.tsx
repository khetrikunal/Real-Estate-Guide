"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCcw, Search, MapPin, Pencil, Trash2 } from "lucide-react"
import { estateApi } from "@app/api/estateApi"
import { getIndianCitiesForState, getIndianStates } from "@app/components/StateCityPicker"
import { PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatCard } from "@/components/shell/stat-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLocationsData } from "@/lib/live-data"
import { cn } from "@/lib/utils"
import { OperationalKpiGroup, PanelTransition, RevealSection } from "@/motion"

type LocationForm = {
  state: string
  city: string
  area: string
  subscriptionRate: string
}

const CUSTOM_VALUE = "__custom__"

const emptyLocationForm: LocationForm = {
  state: "Maharashtra",
  city: "",
  area: "",
  subscriptionRate: "",
}

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const { locations, isFetching } = useLocationsData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locQuery, setLocQuery] = useState("")
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<{ id: string; name: string } | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocationForm)
  const [customCityMode, setCustomCityMode] = useState(false)
  const [customAreaMode, setCustomAreaMode] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!selectedId && locations[0]?.id) setSelectedId(locations[0].id)
    if (selectedId && !locations.some((location) => location.id === selectedId)) setSelectedId(locations[0]?.id ?? null)
  }, [locations, selectedId])

  const filteredLocations = useMemo(() => {
    return locations.filter((l) =>
      `${l.name} ${l.city} ${l.state} ${l.area}`.toLowerCase().includes(locQuery.toLowerCase()),
    )
  }, [locations, locQuery])

  const selected = locations.find((l) => l.id === selectedId) ?? null

  const customCitiesQuery = useQuery({
    queryKey: ["v0", "location-cities"],
    queryFn: async () => {
      const rows = await estateApi.locations.cities()
      return Array.isArray(rows) ? rows : []
    },
  })

  const customCitiesByState = useMemo(() => {
    const grouped: Record<string, string[]> = {}
    for (const row of customCitiesQuery.data ?? []) {
      if (!row || typeof row !== "object") continue
      const record = row as Record<string, unknown>
      const state = String(record.state ?? "").trim()
      const city = String(record.city ?? record.name ?? "").trim()
      if (!state || !city) continue
      grouped[state] = Array.from(new Set([...(grouped[state] ?? []), city])).sort()
    }
    // Also include any cities from existing saved locations
    for (const loc of locations) {
      if (loc.state && loc.city && loc.city !== "-") {
        grouped[loc.state] = Array.from(new Set([...(grouped[loc.state] ?? []), loc.city])).sort()
      }
    }
    return grouped
  }, [customCitiesQuery.data, locations])

  // Cities belonging to the selected State
  const locationCityOptions = useMemo(
    () => getIndianCitiesForState(locationForm.state, customCitiesByState[locationForm.state] ?? []),
    [customCitiesByState, locationForm.state],
  )

  // Areas belonging to the selected State + City
  const availableAreasForLocation = useMemo(() => {
    if (!locationForm.city || !locationForm.state) return []
    const areasFound = new Set<string>()
    for (const loc of locations) {
      if (
        loc.state.toLowerCase() === locationForm.state.toLowerCase() &&
        loc.city.toLowerCase() === locationForm.city.toLowerCase() &&
        loc.area &&
        loc.area !== "-" &&
        loc.area !== "City-wide"
      ) {
        areasFound.add(loc.area)
      }
    }
    return Array.from(areasFound).sort()
  }, [locations, locationForm.city, locationForm.state])

  const highestRate = useMemo(() => {
    const rates = locations
      .map((location) => Number(String(location.rate).replace(/[^\d.-]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0)
    const max = rates.length ? Math.max(...rates) : 0
    return max > 0 ? `₹${max.toLocaleString("en-IN")}` : "Price pending"
  }, [locations])

  const totalCitiesCount = useMemo(() => {
    return new Set(locations.map((l) => l.city).filter((c) => c && c !== "-")).size
  }, [locations])

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["v0", "locations"] })
    queryClient.invalidateQueries({ queryKey: ["v0", "areas"] })
    queryClient.invalidateQueries({ queryKey: ["v0", "location-cities"] })
  }

  const openAddLocation = () => {
    setFormError("")
    setEditingLocationId(null)
    setCustomCityMode(false)
    setCustomAreaMode(false)
    setLocationForm(emptyLocationForm)
    setLocationDialogOpen(true)
  }

  const openEditLocation = (location: (typeof locations)[number]) => {
    setFormError("")
    setEditingLocationId(location.id)
    const isKnownCity = locationCityOptions.includes(location.city)
    setCustomCityMode(!isKnownCity)
    setCustomAreaMode(false)
    setLocationForm({
      state: location.state === "-" ? "Maharashtra" : location.state,
      city: location.city === "-" ? "" : location.city,
      area: location.area === "-" || location.area === "City-wide" ? "" : location.area,
      subscriptionRate: String(location.rate).replace(/[^\d.-]/g, ""),
    })
    setLocationDialogOpen(true)
  }

  const closeLocationDialog = () => {
    setLocationDialogOpen(false)
    setEditingLocationId(null)
    setCustomCityMode(false)
    setCustomAreaMode(false)
    setLocationForm(emptyLocationForm)
    setFormError("")
  }

  const saveLocationMutation = useMutation({
    mutationFn: async () => {
      const state = locationForm.state.trim()
      const city = locationForm.city.trim()
      const area = locationForm.area.trim()
      const rate = Number(locationForm.subscriptionRate)

      const payload = {
        locationName: `${state} - ${city} - ${area}`,
        state,
        city,
        area,
        subscriptionRate: rate,
        pricing: rate,
      }
      if (editingLocationId) return estateApi.locations.update(editingLocationId, payload)
      return estateApi.locations.create(payload)
    },
    onSuccess: () => {
      refreshData()
      closeLocationDialog()
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not save location."),
  })

  const deleteLocationMutation = useMutation({
    mutationFn: () => estateApi.locations.remove(deleteLocationTarget!.id),
    onSuccess: () => {
      refreshData()
      setDeleteLocationTarget(null)
    },
  })

  const saveLocation = () => {
    if (!locationForm.state.trim()) return setFormError("State is required.")
    if (!locationForm.city.trim()) return setFormError("City is required.")
    if (!locationForm.area.trim()) return setFormError("Area is required.")
    const priceNum = Number(locationForm.subscriptionRate)
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setFormError("Location Pricing must be a valid positive number.")
    setFormError("")
    saveLocationMutation.mutate()
  }

  return (
    <div className="reference-page-panel mx-auto my-5 w-[calc(100%-64px)] max-w-[1560px] space-y-6 px-10 py-10">
      <PageHeader
        eyebrow="Settings"
        title="Location Management"
        description="Configure hierarchical project locations (State → City → Area → Pricing) for subscription access and projects."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="transition-transform active:scale-[0.98]" onClick={refreshData} disabled={isFetching}>
              <RefreshCcw className="size-4" />
              {isFetching ? "Refreshing" : "Refresh"}
            </Button>
            <Button className="transition-transform active:scale-[0.98]" onClick={openAddLocation}>
              <MapPin className="size-4" />
              Add Location
            </Button>
          </div>
        }
      />

      <OperationalKpiGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Locations" value={locations.length} hint="State → City → Area entries" tone="primary" />
        <StatCard label="Cities" value={totalCitiesCount} hint="Cities mapped" tone="success" />
        <StatCard label="States" value={new Set(locations.map((l) => l.state).filter((s) => s && s !== "-")).size} hint="State Coverage" tone="warning" />
        <StatCard label="Rate Range" value={highestRate} hint="Highest monthly pricing" />
      </OperationalKpiGroup>

      <RevealSection>
        <SectionCard eyebrow={`${filteredLocations.length} locations`} title="Locations">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground/60" />
              <Input
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="Search state, city, area..."
                className="h-11 pl-10 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground"
              />
            </div>
            <span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground tabular-nums">
              {filteredLocations.length} records
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/80">
                  <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider py-3.5">Location Hierarchy</TableHead>
                  <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider py-3.5">State</TableHead>
                  <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider py-3.5">City</TableHead>
                  <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider py-3.5">Area</TableHead>
                  <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider py-3.5">Location Pricing</TableHead>
                  <TableHead className="text-right font-bold text-foreground text-xs uppercase tracking-wider py-3.5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 font-medium text-foreground/80">
                      No locations found. Click <strong>Add Location</strong> above to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((l) => (
                    <TableRow
                      key={l.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedId === l.id && "bg-primary/10 hover:bg-primary/15",
                      )}
                      onClick={() => setSelectedId(l.id)}
                    >
                      <TableCell className="font-semibold text-foreground">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className="text-foreground font-semibold">{l.state}</span>
                          <span className="text-muted-foreground font-bold">→</span>
                          <span className="text-primary font-bold">{l.city}</span>
                          <span className="text-muted-foreground font-bold">→</span>
                          <span className="text-foreground font-semibold">{l.area}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{l.state}</TableCell>
                      <TableCell className="font-bold text-foreground">{l.city}</TableCell>
                      <TableCell className="font-medium text-foreground">{l.area}</TableCell>
                      <TableCell className="font-mono text-sm font-bold tabular-nums text-primary">{l.rate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="icon" variant="outline" className="size-8 border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors" aria-label={`Edit location ${l.name}`} onClick={(event) => { event.stopPropagation(); openEditLocation(l) }}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="size-8 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-colors" aria-label={`Delete location ${l.name}`} onClick={(event) => { event.stopPropagation(); setDeleteLocationTarget({ id: l.id, name: `${l.state} → ${l.city} → ${l.area}` }) }}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </RevealSection>

      <SectionCard eyebrow="Select row" title="Location detail">
        <PanelTransition motionKey={selected?.id ?? "empty-location"}>
          {selected ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-foreground/80 font-bold">Hierarchy:</span>
                <span className="text-base font-bold text-foreground">
                  {selected.state} → {selected.city} → {selected.area}
                </span>
                <span className="ml-auto font-mono text-sm font-bold text-primary tabular-nums">
                  Pricing: {selected.rate}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="State" value={selected.state} />
                <DetailItem label="City" value={selected.city} />
                <DetailItem label="Area" value={selected.area} />
                <DetailItem label="Location Pricing" value={selected.rate} mono />
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">Select a location row to view details.</p>
          )}
        </PanelTransition>
      </SectionCard>

      {/* Unified Add / Edit Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={(open) => { if (open) setLocationDialogOpen(true); else closeLocationDialog() }}>
        <DialogContent className="max-w-lg border-border bg-background text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingLocationId ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
              Hierarchical structure: <strong className="text-foreground font-semibold">State → City → Area → Pricing</strong>. Baramati is a City; areas inside Baramati are Areas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* 1. State */}
            <Field label="State" required>
              <Select
                value={locationForm.state}
                onValueChange={(value) => {
                  setLocationForm((form) => ({
                    ...form,
                    state: value,
                    city: "",
                    area: "",
                  }))
                  setCustomCityMode(false)
                  setCustomAreaMode(false)
                }}
              >
                <SelectTrigger className="w-full h-10 border-border bg-background text-foreground font-medium">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-border bg-popover text-popover-foreground">
                  {getIndianStates().map((state) => (
                    <SelectItem key={state} value={state} className="font-medium text-foreground">{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* 2. City */}
            <Field label="City" required>
              {!customCityMode ? (
                <div className="space-y-2">
                  <Select
                    value={locationForm.city || undefined}
                    onValueChange={(value) => {
                      if (value === CUSTOM_VALUE) {
                        setCustomCityMode(true)
                        setLocationForm((form) => ({ ...form, city: "", area: "" }))
                      } else {
                        setLocationForm((form) => ({ ...form, city: value, area: "" }))
                      }
                      setCustomAreaMode(false)
                    }}
                  >
                    <SelectTrigger className="w-full h-10 border-border bg-background text-foreground font-medium">
                      <SelectValue placeholder="Select City (e.g. Pune, Baramati)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 border-border bg-popover text-popover-foreground">
                      {locationCityOptions.map((city) => (
                        <SelectItem key={city} value={city} className="font-medium text-foreground">{city}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_VALUE} className="text-primary font-semibold">
                        ➕ Enter custom / new city...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={locationForm.city}
                    onChange={(e) => setLocationForm((form) => ({ ...form, city: e.target.value, area: "" }))}
                    placeholder="Enter City (e.g. Baramati)"
                    autoFocus
                    className="h-10 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 border-border text-foreground font-semibold"
                    onClick={() => {
                      setCustomCityMode(false)
                      setLocationForm((form) => ({ ...form, city: "", area: "" }))
                    }}
                  >
                    Select from list
                  </Button>
                </div>
              )}
            </Field>

            {/* 3. Area */}
            <Field label="Area" required>
              {!customAreaMode && availableAreasForLocation.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={locationForm.area || undefined}
                    onValueChange={(value) => {
                      if (value === CUSTOM_VALUE) {
                        setCustomAreaMode(true)
                        setLocationForm((form) => ({ ...form, area: "" }))
                      } else {
                        setLocationForm((form) => ({ ...form, area: value }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-10 border-border bg-background text-foreground font-medium">
                      <SelectValue placeholder="Select or Enter Area" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 border-border bg-popover text-popover-foreground">
                      {availableAreasForLocation.map((area) => (
                        <SelectItem key={area} value={area} className="font-medium text-foreground">{area}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_VALUE} className="text-primary font-semibold">
                        ➕ Enter new area...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={locationForm.area}
                    onChange={(e) => setLocationForm((form) => ({ ...form, area: e.target.value }))}
                    placeholder="Enter Area (e.g. Area A, MIDC, Kasba)"
                    className="h-10 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground"
                  />
                  {availableAreasForLocation.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 border-border text-foreground font-semibold"
                      onClick={() => {
                        setCustomAreaMode(false)
                        setLocationForm((form) => ({ ...form, area: "" }))
                      }}
                    >
                      Select list
                    </Button>
                  )}
                </div>
              )}
            </Field>

            {/* 4. Location Pricing */}
            <Field label="Location Pricing (₹)" required>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground/80 pointer-events-none">₹</span>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={locationForm.subscriptionRate}
                  onChange={(event) => setLocationForm((form) => ({ ...form, subscriptionRate: event.target.value }))}
                  placeholder="500"
                  className="h-10 pl-8 border-border bg-background text-foreground font-medium placeholder:text-muted-foreground tabular-nums"
                />
              </div>
            </Field>

            {/* Preview Hierarchy */}
            {locationForm.state && locationForm.city && locationForm.area && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3.5 text-xs text-foreground space-y-1">
                <div className="font-bold text-primary uppercase tracking-wider text-[11px]">
                  Entry preview
                </div>
                <div className="font-medium text-foreground text-sm flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="font-bold text-foreground">{locationForm.state}</span>
                  <span className="text-muted-foreground font-bold">→</span>
                  <span className="font-bold text-primary">{locationForm.city}</span>
                  <span className="text-muted-foreground font-bold">→</span>
                  <span className="font-bold text-foreground">{locationForm.area}</span>
                  <span className="text-muted-foreground font-bold">→</span>
                  <span className="font-mono font-bold text-primary tabular-nums">
                    {locationForm.subscriptionRate ? `₹${Number(locationForm.subscriptionRate).toLocaleString("en-IN")}` : "₹___"}
                  </span>
                </div>
              </div>
            )}

            {formError ? <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" type="button" onClick={closeLocationDialog} className="border-border text-foreground hover:bg-muted font-semibold">
              Cancel
            </Button>
            <Button type="button" onClick={saveLocation} disabled={saveLocationMutation.isPending} className="font-semibold">
              {saveLocationMutation.isPending ? "Saving..." : editingLocationId ? "Update Location" : "Add Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Location Dialog */}
      <Dialog open={!!deleteLocationTarget} onOpenChange={(open) => { if (!open) setDeleteLocationTarget(null) }}>
        <DialogContent className="border-border bg-background text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Delete Location</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground font-semibold">{deleteLocationTarget?.name}</strong>? This removes the location entry from backend records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" type="button" onClick={() => setDeleteLocationTarget(null)} className="border-border text-foreground hover:bg-muted font-semibold">
              Cancel
            </Button>
            <Button variant="destructive" type="button" onClick={() => deleteLocationMutation.mutate()} disabled={deleteLocationMutation.isPending} className="font-semibold">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-destructive font-bold text-sm" aria-hidden="true">*</span>}
      </Label>
      {children}
    </div>
  )
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/70">{label}</div>
      <div className={cn("mt-1.5 text-base font-bold text-foreground", mono && "font-mono tabular-nums text-primary")}>{value}</div>
    </div>
  )
}
