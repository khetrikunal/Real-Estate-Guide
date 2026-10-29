"use client"

import Link from "next/link"
import { use, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Plus,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
  RotateCcw,
  Trash2,
  Building2,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PropertyCard } from "@/components/property/property-card"
import { useProjectsData, useTrashProjectsData } from "@/lib/live-data"
import { estateApi } from "@app/api/estateApi"
import { useToast } from "@/hooks/use-toast"
import { AnimatedRows, PanelTransition, RevealSection } from "@app/motion"
import { cn } from "@/lib/utils"
import type { Property } from "@/lib/data"

type RoleParams = { role: string } | Promise<{ role: string }>

function isPromiseParams(params: RoleParams): params is Promise<{ role: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

export default function PropertiesPage({ params }: { params: RoleParams }) {
  const { role } = isPromiseParams(params) ? use(params) : params
  return <PropertiesContent role={role} />
}

function PropertiesContent({ role }: { role: string }) {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get("tab") === "trash" ? "trash" : "active"

  const { projects, isFetching: isProjectsFetching, refetch: refetchProjects } = useProjectsData()
  const { trashedProjects, isFetching: isTrashFetching, refetch: refetchTrash } = useTrashProjectsData()

  // View & filter states
  const [viewMode, setViewMode] = useState<"row" | "grid">("grid")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [configType, setConfigType] = useState("all")
  const [city, setCity] = useState("all")
  const [area, setArea] = useState("all")
  const [listingType, setListingType] = useState("all")
  const [status, setStatus] = useState("all")
  const [availability, setAvailability] = useState("all")
  const [completion, setCompletion] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  // Deletion and Trash action states
  const [trashCandidate, setTrashCandidate] = useState<Property | null>(null)
  const [isTrashing, setIsTrashing] = useState(false)

  const [permanentDeleteCandidate, setPermanentDeleteCandidate] = useState<Property | null>(null)
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false)

  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleTabChange = (tab: "active" | "trash") => {
    if (tab === "trash") {
      setSearchParams({ tab: "trash" })
    } else {
      setSearchParams({})
    }
  }

  // --- Handlers ---
  const handleConfirmMoveToTrash = async () => {
    if (!trashCandidate || isTrashing) return
    try {
      setIsTrashing(true)
      await estateApi.projects.moveToTrash(trashCandidate.id)
      toast({
        title: "Moved to Trash",
        description: `"${trashCandidate.name}" was moved to Trash. You can restore it later from the Trash section.`,
      })
      setTrashCandidate(null)
      await Promise.all([refetchProjects(), refetchTrash()])
    } catch (err: any) {
      toast({
        title: "Failed to move project to Trash",
        description: err?.message || "An unexpected error occurred while moving project to Trash.",
        variant: "destructive",
      })
    } finally {
      setIsTrashing(false)
    }
  }

  const handleRestore = async (property: Property) => {
    if (restoringId) return
    try {
      setRestoringId(property.id)
      await estateApi.projects.restore(property.id)
      toast({
        title: "Project Restored",
        description: `"${property.name}" has been restored to active projects.`,
      })
      await Promise.all([refetchProjects(), refetchTrash()])
    } catch (err: any) {
      toast({
        title: "Failed to restore project",
        description: err?.message || "An unexpected error occurred while restoring project.",
        variant: "destructive",
      })
    } finally {
      setRestoringId(null)
    }
  }

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteCandidate || isDeletingPermanently) return
    try {
      setIsDeletingPermanently(true)
      await estateApi.projects.permanentDelete(permanentDeleteCandidate.id)
      toast({
        title: "Project Permanently Deleted",
        description: `"${permanentDeleteCandidate.name}" has been permanently deleted.`,
      })
      setPermanentDeleteCandidate(null)
      await Promise.all([refetchProjects(), refetchTrash()])
    } catch (err: any) {
      const errorMessage =
        err?.message || err?.details?.message || "An error occurred while deleting the project."
      toast({
        title: "Could not delete project",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeletingPermanently(false)
    }
  }

  // Filter options for active projects
  const configTypeOptions = useMemo(
    () => uniqueSorted(projects.flatMap((project) => (project.configTypes?.length ? project.configTypes : [project.config]))),
    [projects],
  )
  const cityOptions = useMemo(
    () => uniqueSorted(projects.map((project) => project.city).filter((value) => value && value !== "-")),
    [projects],
  )
  const areaOptions = useMemo(
    () =>
      uniqueSorted(
        projects
          .filter((project) => city === "all" || sameText(project.city, city))
          .map((project) => project.area ?? "")
          .filter(Boolean),
      ),
    [projects, city],
  )
  const listingTypeOptions = useMemo(
    () => uniqueSorted(projects.flatMap((project) => project.listingTypes ?? [])),
    [projects],
  )

  const filteredProjects = useMemo(() => {
    const min = parsePriceInput(minPrice)
    const max = parsePriceInput(maxPrice)
    return [...projects]
      .filter((project) => {
        const configMatches =
          configType === "all" ||
          (project.configTypes?.some((value) => sameText(value, configType)) ?? false) ||
          sameText(project.config, configType)
        if (!configMatches) return false
        if (city !== "all" && !sameText(project.city, city)) return false
        if (area !== "all" && !sameText(project.area, area)) return false
        if (listingType !== "all" && !(project.listingTypes ?? []).some((value) => sameText(value, listingType))) return false
        if (status !== "all" && project.status !== status) return false
        if (availability === "available" && Math.max(project.unitsTotal - project.unitsSold, 0) <= 0) return false
        if (availability === "sold-out" && !(project.unitsTotal > 0 && project.unitsSold >= project.unitsTotal)) return false
        if (completion !== "all" && (project.completion ?? 0) < Number(completion)) return false
        if (min !== undefined && project.priceValue < min) return false
        if (max !== undefined && project.priceValue > max) return false
        return true
      })
      .sort((left, right) => {
        if (sortBy === "price-asc") return left.priceValue - right.priceValue
        if (sortBy === "price-desc") return right.priceValue - left.priceValue
        if (sortBy === "units") return right.unitsTotal - left.unitsTotal
        if (sortBy === "completion") return (right.completion ?? 0) - (left.completion ?? 0)
        return left.name.localeCompare(right.name)
      })
  }, [area, availability, city, completion, configType, listingType, maxPrice, minPrice, projects, sortBy, status])

  const activeFilterCount = [
    configType !== "all",
    city !== "all",
    area !== "all",
    listingType !== "all",
    status !== "all",
    availability !== "all",
    completion !== "all",
    minPrice.trim() !== "",
    maxPrice.trim() !== "",
  ].filter(Boolean).length

  const resetFilters = () => {
    setConfigType("all")
    setCity("all")
    setArea("all")
    setListingType("all")
    setStatus("all")
    setAvailability("all")
    setCompletion("all")
    setMinPrice("")
    setMaxPrice("")
  }

  return (
    <PageContainer className="max-w-[1720px] py-5">
      <div className="reference-page-panel px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Inventory"
          title="Properties"
          description="Manage and add projects across all your locations."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant={activeTab === "trash" ? "default" : "outline"}
                className={cn(
                  "gap-1.5 transition-colors",
                  activeTab === "trash" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
                onClick={() => handleTabChange(activeTab === "trash" ? "active" : "trash")}
              >
                <Trash2 className="h-4 w-4" />
                Trash
                {trashedProjects.length > 0 && (
                  <span className="ml-1 rounded-full bg-background/25 px-1.5 py-0.5 text-xs font-mono font-semibold">
                    {trashedProjects.length}
                  </span>
                )}
              </Button>
              <Button asChild className="glow-primary gap-1.5">
                <Link href={`/${role}/properties/new`}>
                  <Plus className="h-4 w-4" />
                  Add new project
                </Link>
              </Button>
            </div>
          }
        />

        {/* Tab switcher: Active Projects vs Trash */}
        <div className="mt-8 flex items-center justify-between gap-4 flex-wrap border-b border-border/80 pb-4">
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-1 border border-border/70">
            <button
              type="button"
              onClick={() => handleTabChange("active")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "active"
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
              )}
            >
              <Building2 className="h-4 w-4" />
              Active Projects
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-mono font-semibold",
                  activeTab === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {projects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("trash")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "trash"
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
              )}
            >
              <Trash2 className="h-4 w-4" />
              Trash
              {trashedProjects.length > 0 ? (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-mono font-semibold",
                    activeTab === "trash" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  {trashedProjects.length}
                </span>
              ) : null}
            </button>
          </div>

          {activeTab === "active" && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setViewMode("grid")}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "row" ? "secondary" : "ghost"}
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setViewMode("row")}
                title="Row view"
                aria-label="Row view"
              >
                <Rows3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: ACTIVE PROJECTS */}
        {activeTab === "active" && (
          <>
            {/* Filter bar */}
            <RevealSection className="mt-6">
              <SectionCard contentClassName="p-4 sm:p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select value={configType} onValueChange={setConfigType}>
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 sm:w-44">
                        <SelectValue placeholder="All config types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All config types</SelectItem>
                        {configTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {titleCase(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={city}
                      onValueChange={(value) => {
                        setCity(value)
                        setArea("all")
                      }}
                    >
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 sm:w-44">
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {cityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={area} onValueChange={setArea} disabled={areaOptions.length === 0}>
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 sm:w-44">
                        <SelectValue placeholder={city === "all" ? "Select city first" : "All areas"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All areas</SelectItem>
                        {areaOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={listingType} onValueChange={setListingType}>
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 sm:w-44">
                        <SelectValue placeholder="All listing types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All listing types</SelectItem>
                        {listingTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {titleCase(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Button
                        type="button"
                        variant={showMoreFilters || activeFilterCount > 0 ? "secondary" : "outline"}
                        size="sm"
                        className="h-10 gap-1.5 px-3"
                        onClick={() => setShowMoreFilters((value) => !value)}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filters
                        {activeFilterCount > 0 ? (
                          <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                            {activeFilterCount}
                          </span>
                        ) : null}
                      </Button>
                      {activeFilterCount > 0 ? (
                        <Button type="button" variant="ghost" size="sm" className="h-10 px-2.5 text-xs" onClick={resetFilters}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {showMoreFilters ? (
                    <PanelTransition motionKey="more-filters" className="border-border/70 border-t pt-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Project status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={availability} onValueChange={setAvailability}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All availability</SelectItem>
                            <SelectItem value="available">Available units</SelectItem>
                            <SelectItem value="sold-out">Sold out</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                            <SelectItem value="price-asc">Price: Low to High</SelectItem>
                            <SelectItem value="price-desc">Price: High to Low</SelectItem>
                            <SelectItem value="units">Most units</SelectItem>
                            <SelectItem value="completion">Completion %</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={completion} onValueChange={setCompletion}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Completion" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any completion</SelectItem>
                            <SelectItem value="25">25% and above</SelectItem>
                            <SelectItem value="50">50% and above</SelectItem>
                            <SelectItem value="75">75% and above</SelectItem>
                            <SelectItem value="100">100%</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={minPrice}
                            onChange={(event) => setMinPrice(event.target.value)}
                            inputMode="numeric"
                            placeholder="Min price"
                            className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-2 focus:ring-ring/25"
                          />
                          <input
                            value={maxPrice}
                            onChange={(event) => setMaxPrice(event.target.value)}
                            inputMode="numeric"
                            placeholder="Max price"
                            className="border-input bg-background h-10 min-w-0 rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-2 focus:ring-ring/25"
                          />
                        </div>
                      </div>
                    </PanelTransition>
                  ) : null}
                  <div className="text-muted-foreground text-right text-xs font-medium">
                    Showing {filteredProjects.length} of {projects.length} projects
                  </div>
                </div>
              </SectionCard>
            </RevealSection>

            {/* Property list */}
            <PanelTransition motionKey={viewMode} className="mt-6">
              <AnimatedRows className={viewMode === "grid" ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "flex flex-col gap-3"}>
                {filteredProjects.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    href={`/${role}/properties/${p.id}/configurations`}
                    variant={viewMode === "grid" ? "grid" : "row"}
                    onDelete={(targetProperty) => setTrashCandidate(targetProperty)}
                  />
                ))}
              </AnimatedRows>
              {filteredProjects.length === 0 ? (
                <div className="border-border bg-muted/20 mt-4 rounded-xl border p-8 text-center">
                  <div className="text-sm font-semibold">{projects.length === 0 ? "Your portfolio starts here" : "No projects match these filters"}</div>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {projects.length === 0 ? "Add your first property to manage its pricing, availability, and documents." : "Adjust the filters or reset them to view all projects."}
                  </div>
                </div>
              ) : null}
            </PanelTransition>
          </>
        )}

        {/* TAB 2: TRASH SECTION */}
        {activeTab === "trash" && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                  Trash Management
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trashed projects remain stored safely. You can restore them to active projects anytime or permanently delete them.
                </p>
              </div>
              <div className="text-xs font-medium text-muted-foreground font-mono">
                {trashedProjects.length} {trashedProjects.length === 1 ? "project in Trash" : "projects in Trash"}
              </div>
            </div>

            {trashedProjects.length === 0 ? (
              <div className="border-border bg-muted/20 rounded-2xl border p-12 text-center my-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-4">
                  <Trash2 className="h-7 w-7 opacity-60" />
                </div>
                <div className="text-base font-semibold text-foreground">Trash is empty</div>
                <div className="text-muted-foreground mt-1 text-sm max-w-sm mx-auto">
                  Projects moved to Trash will appear here. No trashed projects found.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5 gap-1.5"
                  onClick={() => handleTabChange("active")}
                >
                  <Building2 className="h-4 w-4" />
                  View Active Projects
                </Button>
              </div>
            ) : (
              <AnimatedRows className="flex flex-col gap-3.5">
                {trashedProjects.map((p) => {
                  const locationText =
                    p.city && p.area ? `${p.city} → ${p.area}` : p.city || p.area || ""
                  return (
                    <div
                      key={p.id}
                      className="surface-elevated border-border/80 relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border p-4.5 transition-all shadow-sm"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="border-border/80 bg-muted/30 relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border h-16 w-16">
                          {p.cover && !p.noImage ? (
                            <img src={p.cover} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="text-muted-foreground/60 h-7 w-7" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-sm font-bold text-foreground truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                              In Trash
                            </span>
                          </div>

                          <div className="text-muted-foreground mt-1.5 grid gap-1 text-xs">
                            <div className="flex items-center gap-3 flex-wrap">
                              {p.config && <span className="text-foreground/90 font-medium">{p.config}</span>}
                              {locationText && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {locationText}
                                </span>
                              )}
                              {p.price && <span className="font-mono">{p.price}</span>}
                              <span>
                                Units: {p.unitsSold}/{p.unitsTotal}
                              </span>
                            </div>

                            {/* Trash timestamp */}
                            <div className="text-destructive/80 text-[11px] flex items-center gap-1.5 font-medium mt-0.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              Moved to Trash: {formatTrashDate(p.deletedAt)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                          disabled={restoringId === p.id}
                          onClick={() => handleRestore(p)}
                        >
                          {restoringId === p.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" />
                              Restore
                            </>
                          )}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5 font-medium"
                          disabled={isDeletingPermanently}
                          onClick={() => setPermanentDeleteCandidate(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Permanently
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </AnimatedRows>
            )}
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOG 1: MOVE TO TRASH */}
      <Dialog
        open={Boolean(trashCandidate)}
        onOpenChange={(open) => !isTrashing && !open && setTrashCandidate(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Trash2 className="h-5 w-5 text-amber-500" />
              Move Project to Trash
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to move{" "}
              <span className="font-semibold text-foreground">"{trashCandidate?.name}"</span> to Trash?
              You can restore it later from the Trash section.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isTrashing}
              onClick={() => setTrashCandidate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5"
              disabled={isTrashing}
              onClick={handleConfirmMoveToTrash}
            >
              {isTrashing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Moving to Trash...
                </>
              ) : (
                "Move to Trash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG 2: PERMANENT DELETION */}
      <Dialog
        open={Boolean(permanentDeleteCandidate)}
        onOpenChange={(open) => !isDeletingPermanently && !open && setPermanentDeleteCandidate(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Permanently Delete Project
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                "{permanentDeleteCandidate?.name}"
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingPermanently}
              onClick={() => setPermanentDeleteCandidate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="font-medium gap-1.5"
              disabled={isDeletingPermanently}
              onClick={handleConfirmPermanentDelete}
            >
              {isDeletingPermanently ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function sameText(left: string | undefined, right: string) {
  return (left ?? "").trim().toLowerCase() === right.trim().toLowerCase()
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  )
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}

function parsePriceInput(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value.replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatTrashDate(value?: string | null) {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}
