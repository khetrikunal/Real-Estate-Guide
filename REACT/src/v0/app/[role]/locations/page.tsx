"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, RefreshCcw, Search, MapPin, Pencil, Trash2 } from "lucide-react"
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
  locationName: string
  state: string
  city: string
  area: string
  subscriptionRate: string
}

type AreaForm = {
  name: string
  state: string
  city: string
}

type CityForm = {
  state: string
  city: string
}

const emptyLocationForm: LocationForm = {
  locationName: "",
  state: "Maharashtra",
  city: "",
  area: "",
  subscriptionRate: "",
}

const emptyAreaForm: AreaForm = {
  name: "",
  state: "Maharashtra",
  city: "",
}

const emptyCityForm: CityForm = {
  state: "Maharashtra",
  city: "",
}

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const { locations, areas, isFetching } = useLocationsData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locQuery, setLocQuery] = useState("")
  const [areaQuery, setAreaQuery] = useState("")
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [areaDialogOpen, setAreaDialogOpen] = useState(false)
  const [cityDialogOpen, setCityDialogOpen] = useState(false)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<{ id: string; name: string } | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocationForm)
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm)
  const [cityForm, setCityForm] = useState<CityForm>(emptyCityForm)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!selectedId && locations[0]?.id) setSelectedId(locations[0].id)
    if (selectedId && !locations.some((location) => location.id === selectedId)) setSelectedId(locations[0]?.id ?? null)
  }, [locations, selectedId])

  const filteredLocations = locations.filter((l) =>
    `${l.name} ${l.city} ${l.state} ${l.area}`.toLowerCase().includes(locQuery.toLowerCase()),
  )
  const filteredAreas = areas.filter((a) =>
    `${a.name} ${a.city} ${a.state}`.toLowerCase().includes(areaQuery.toLowerCase()),
  )
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
    return grouped
  }, [customCitiesQuery.data])

  const locationCityOptions = useMemo(
    () => getIndianCitiesForState(locationForm.state, customCitiesByState[locationForm.state] ?? []),
    [customCitiesByState, locationForm.state],
  )
  const areaCityOptions = useMemo(
    () => getIndianCitiesForState(areaForm.state, customCitiesByState[areaForm.state] ?? []),
    [areaForm.state, customCitiesByState],
  )
  const availableAreasForLocation = useMemo(
    () => areas.filter((area) => area.city === locationForm.city && area.state === locationForm.state),
    [areas, locationForm.city, locationForm.state],
  )
  const highestRate = useMemo(() => {
    const rates = locations
      .map((location) => Number(String(location.rate).replace(/[^\d.-]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0)
    const max = rates.length ? Math.max(...rates) : 0
    return max > 0 ? `₹${max.toLocaleString("en-IN")}` : "Price pending"
  }, [locations])

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["v0", "locations"] })
    queryClient.invalidateQueries({ queryKey: ["v0", "areas"] })
    queryClient.invalidateQueries({ queryKey: ["v0", "location-cities"] })
  }

  const openAddLocation = () => {
    setFormError("")
    setEditingLocationId(null)
    setLocationForm(emptyLocationForm)
    setLocationDialogOpen(true)
  }

  const openEditLocation = (location: (typeof locations)[number]) => {
    setFormError("")
    setEditingLocationId(location.id)
    setLocationForm({
      locationName: location.name === "-" ? "" : location.name,
      state: location.state === "-" ? "Maharashtra" : location.state,
      city: location.city === "-" ? "" : location.city,
      area: location.area === "City-wide" || location.area === "-" ? "" : location.area,
      subscriptionRate: String(location.rate).replace(/[^\d.-]/g, ""),
    })
    setLocationDialogOpen(true)
  }

  const openAddArea = () => {
    setFormError("")
    setAreaForm(emptyAreaForm)
    setAreaDialogOpen(true)
  }

  const openAddCity = () => {
    setFormError("")
    setCityForm(emptyCityForm)
    setCityDialogOpen(true)
  }

  const closeLocationDialog = () => {
    setLocationDialogOpen(false)
    setEditingLocationId(null)
    setLocationForm(emptyLocationForm)
    setFormError("")
  }

  const closeAreaDialog = () => {
    setAreaDialogOpen(false)
    setAreaForm(emptyAreaForm)
    setFormError("")
  }

  const closeCityDialog = () => {
    setCityDialogOpen(false)
    setCityForm(emptyCityForm)
    setFormError("")
  }

  const saveLocationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        locationName: locationForm.locationName.trim(),
        state: locationForm.state.trim(),
        city: locationForm.city.trim(),
        area: locationForm.area.trim() || undefined,
        subscriptionRate: Number(locationForm.subscriptionRate),
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

  const createAreaMutation = useMutation({
    mutationFn: () => estateApi.locations.createArea({
      name: areaForm.name.trim(),
      state: areaForm.state.trim(),
      city: areaForm.city.trim(),
    }),
    onSuccess: () => {
      refreshData()
      closeAreaDialog()
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not add area."),
  })

  const createCityMutation = useMutation({
    mutationFn: () => estateApi.locations.createCity({
      state: cityForm.state.trim(),
      city: cityForm.city.trim().replace(/\s+/g, " "),
    }),
    onSuccess: () => {
      refreshData()
      closeCityDialog()
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not add city."),
  })

  const deleteLocationMutation = useMutation({
    mutationFn: () => estateApi.locations.remove(deleteLocationTarget!.id),
    onSuccess: () => {
      refreshData()
      setDeleteLocationTarget(null)
    },
  })

  const deleteAreaMutation = useMutation({
    mutationFn: () => estateApi.locations.deleteArea(deleteAreaTarget!.id),
    onSuccess: () => {
      refreshData()
      setDeleteAreaTarget(null)
    },
  })

  const saveLocation = () => {
    if (locationForm.locationName.trim().length < 2) return setFormError("Location name is required.")
    if (!locationForm.state.trim() || !locationForm.city.trim()) return setFormError("State and city are required.")
    if (Number(locationForm.subscriptionRate) <= 0) return setFormError("Monthly rate must be positive.")
    setFormError("")
    saveLocationMutation.mutate()
  }

  const saveArea = () => {
    if (areaForm.name.trim().length < 2) return setFormError("Area name is required.")
    if (!areaForm.state.trim() || !areaForm.city.trim()) return setFormError("State and city are required.")
    setFormError("")
    createAreaMutation.mutate()
  }

  const saveCity = () => {
    if (!cityForm.state.trim()) return setFormError("State is required.")
    if (cityForm.city.trim().length < 2) return setFormError("City name is required.")
    setFormError("")
    createCityMutation.mutate()
  }

  return (
    <div className="reference-page-panel mx-auto my-5 w-[calc(100%-64px)] max-w-[1560px] space-y-6 px-10 py-10">
      <PageHeader
        eyebrow="Settings"
        title="Location Management"
        description="Manage project locations for subscription-based access."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="transition-transform active:scale-[0.98]" onClick={refreshData} disabled={isFetching}>
              <RefreshCcw className="size-4" />
              {isFetching ? "Refreshing" : "Refresh"}
            </Button>
            <Button variant="outline" className="transition-transform active:scale-[0.98]" onClick={openAddCity}>
              <Plus className="size-4" />
              Add City
            </Button>
            <Button className="transition-transform active:scale-[0.98]" onClick={openAddLocation}>
              <MapPin className="size-4" />
              Add Location
            </Button>
            <Button variant="outline" className="transition-transform active:scale-[0.98]" onClick={openAddArea}>
              <Plus className="size-4" />
              Add Area
            </Button>
          </div>
        }
      />

      <OperationalKpiGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Locations" value={locations.length} hint="Total mapped" tone="primary" />
        <StatCard label="Areas" value={areas.length} hint="Subdivisions" tone="success" />
        <StatCard label="States" value={new Set(locations.map((l) => l.state)).size} hint="Coverage" tone="warning" />
        <StatCard label="Rate Lookup" value={highestRate} hint="Highest monthly" />
      </OperationalKpiGroup>

      <RevealSection>
      <SectionCard eyebrow={`${filteredLocations.length} locations`} title="Locations">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={locQuery}
              onChange={(e) => setLocQuery(e.target.value)}
              placeholder="Search location..."
              className="h-11 pl-9"
            />
          </div>
          <span className="rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
            {filteredLocations.length} records
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Location Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((l) => (
                <TableRow
                  key={l.id}
                  className={cn(
                    "cursor-pointer",
                    selectedId === l.id && "bg-primary/5 hover:bg-primary/10",
                  )}
                  onClick={() => setSelectedId(l.id)}
                >
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.city}</TableCell>
                  <TableCell className="text-muted-foreground">{l.state}</TableCell>
                  <TableCell className="text-muted-foreground">{l.area}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{l.rate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit location ${l.name}`} onClick={(event) => { event.stopPropagation(); openEditLocation(l) }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" aria-label={`Delete location ${l.name}`} onClick={(event) => { event.stopPropagation(); setDeleteLocationTarget({ id: l.id, name: l.name }) }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
      </RevealSection>

      <SectionCard eyebrow="Select row" title="Location detail">
        <PanelTransition motionKey={selected?.id ?? "empty-location"}>
          {selected ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Location" value={selected.name} />
              <DetailItem label="City" value={selected.city} />
              <DetailItem label="State" value={selected.state} />
              <DetailItem label="Monthly rate" value={selected.rate} mono />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a location row to view details.</p>
          )}
        </PanelTransition>
      </SectionCard>

      <SectionCard eyebrow={`${filteredAreas.length} areas`} title="Areas">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={areaQuery}
              onChange={(e) => setAreaQuery(e.target.value)}
              placeholder="Search areas..."
              className="h-11 pl-9"
            />
          </div>
          <span className="rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
            {filteredAreas.length} records
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Area Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAreas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.city}</TableCell>
                  <TableCell className="text-muted-foreground">{a.state}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" aria-label={`Delete area ${a.name}`} onClick={() => setDeleteAreaTarget({ id: a.id, name: a.name })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <Dialog open={locationDialogOpen} onOpenChange={(open) => { if (open) setLocationDialogOpen(true); else closeLocationDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocationId ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>City is required. Area is optional for city-wide access.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Location name">
              <Input value={locationForm.locationName} onChange={(event) => setLocationForm((form) => ({ ...form, locationName: event.target.value }))} placeholder="e.g. MIDC" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="State">
                <Select value={locationForm.state} onValueChange={(value) => setLocationForm((form) => ({ ...form, state: value, city: "", area: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{getIndianStates().map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <Select value={locationForm.city} onValueChange={(value) => setLocationForm((form) => ({ ...form, city: value, area: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>{locationCityOptions.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Area">
                <Select value={locationForm.area || "__city_wide__"} onValueChange={(value) => setLocationForm((form) => ({ ...form, area: value === "__city_wide__" ? "" : value }))}>
                  <SelectTrigger><SelectValue placeholder="City-wide / all areas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__city_wide__">City-wide / all areas</SelectItem>
                    {availableAreasForLocation.map((area) => <SelectItem key={area.id} value={area.name}>{area.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Monthly rate">
                <Input type="number" min={1} value={locationForm.subscriptionRate} onChange={(event) => setLocationForm((form) => ({ ...form, subscriptionRate: event.target.value }))} placeholder="6000" />
              </Field>
            </div>
            {formError ? <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={closeLocationDialog}>Cancel</Button>
            <Button type="button" onClick={saveLocation} disabled={saveLocationMutation.isPending}>
              {saveLocationMutation.isPending ? "Saving..." : "Save Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cityDialogOpen} onOpenChange={(open) => { if (open) setCityDialogOpen(true); else closeCityDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add City</DialogTitle>
            <DialogDescription>Select a state, then add a custom city to the shared city dropdown.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="State">
              <Select value={cityForm.state} onValueChange={(value) => setCityForm((form) => ({ ...form, state: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{getIndianStates().map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="City name">
              <Input value={cityForm.city} onChange={(event) => setCityForm((form) => ({ ...form, city: event.target.value }))} placeholder="e.g. Baramati" />
            </Field>
            {formError ? <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={closeCityDialog}>Cancel</Button>
            <Button type="button" onClick={saveCity} disabled={createCityMutation.isPending}>
              {createCityMutation.isPending ? "Adding..." : "Add City"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={areaDialogOpen} onOpenChange={(open) => { if (open) setAreaDialogOpen(true); else closeAreaDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Area</DialogTitle>
            <DialogDescription>Select state and city, then add the area name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="State">
                <Select value={areaForm.state} onValueChange={(value) => setAreaForm((form) => ({ ...form, state: value, city: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{getIndianStates().map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <Select value={areaForm.city} onValueChange={(value) => setAreaForm((form) => ({ ...form, city: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>{areaCityOptions.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Area name">
              <Input value={areaForm.name} onChange={(event) => setAreaForm((form) => ({ ...form, name: event.target.value }))} placeholder="e.g. MIDC" />
            </Field>
            {formError ? <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={closeAreaDialog}>Cancel</Button>
            <Button type="button" onClick={saveArea} disabled={createAreaMutation.isPending}>
              {createAreaMutation.isPending ? "Adding..." : "Add Area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteLocationTarget} onOpenChange={(open) => { if (!open) setDeleteLocationTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>Delete {deleteLocationTarget?.name}? This removes the location from backend records.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setDeleteLocationTarget(null)}>Cancel</Button>
            <Button variant="destructive" type="button" onClick={() => deleteLocationMutation.mutate()} disabled={deleteLocationMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAreaTarget} onOpenChange={(open) => { if (!open) setDeleteAreaTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Area</DialogTitle>
            <DialogDescription>Delete {deleteAreaTarget?.name}? Existing projects with this area tag are not deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setDeleteAreaTarget(null)}>Cancel</Button>
            <Button variant="destructive" type="button" onClick={() => deleteAreaMutation.mutate()} disabled={deleteAreaMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1.5 text-base font-semibold", mono && "font-mono tabular-nums")}>{value}</div>
    </div>
  )
}
