"use client"

import Link from "next/link"
import { use, useMemo, useState } from "react"
import { Plus, SlidersHorizontal, LayoutGrid, Rows3, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PropertyCard } from "@/components/property/property-card"
import { useProjectsData } from "@/lib/live-data"
import { AnimatedRows, PanelTransition, RevealSection } from "@app/motion"

type RoleParams = { role: string } | Promise<{ role: string }>

function isPromiseParams(params: RoleParams): params is Promise<{ role: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

export default function PropertiesPage({ params }: { params: RoleParams }) {
  const { role } = isPromiseParams(params) ? use(params) : params
  return <PropertiesContent role={role} />
}

function PropertiesContent({ role }: { role: string }) {
  const { projects } = useProjectsData()
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

  const configTypeOptions = useMemo(
    () => uniqueSorted(projects.flatMap((project) => project.configTypes?.length ? project.configTypes : [project.config])),
    [projects],
  )
  const cityOptions = useMemo(() => uniqueSorted(projects.map((project) => project.city).filter((value) => value && value !== "-")), [projects])
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
  const listingTypeOptions = useMemo(() => uniqueSorted(projects.flatMap((project) => project.listingTypes ?? [])), [projects])

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
      <div className="reference-page-panel px-10 py-10">
      <PageHeader
        eyebrow="Inventory"
        title="Properties"
        description="Manage and add projects across all your locations."
        actions={
          <Button asChild className="glow-primary gap-1.5">
            <Link href={`/${role}/properties/new`}>
              <Plus className="h-4 w-4" />
              Add new project
            </Link>
          </Button>
        }
      />

      {/* Filter bar */}
      <RevealSection className="mt-8">
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
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="price-asc">Sort: Price low-high</SelectItem>
              <SelectItem value="price-desc">Sort: Price high-low</SelectItem>
              <SelectItem value="units">Sort: Units</SelectItem>
              <SelectItem value="completion">Sort: Completion</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
              {activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset ({activeFilterCount})
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transform-none"
                aria-expanded={showMoreFilters}
                onClick={() => setShowMoreFilters((value) => !value)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {showMoreFilters ? "Less filters" : "More filters"}
              </Button>
              <div className="border-border bg-muted/40 flex items-center gap-1 rounded-lg border p-0.5">
                <Button
                  variant={viewMode === "row" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Show row view"
                  aria-pressed={viewMode === "row"}
                  onClick={() => setViewMode("row")}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Show grid view"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
            </div>
          </div>
        </div>
        {showMoreFilters ? (
          <PanelTransition motionKey="more-filters">
            <div className="border-border/70 grid grid-cols-1 gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6">
              <Select value={listingType} onValueChange={setListingType}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Listing type" />
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
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Status" />
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
                  <SelectItem value="available">Units available</SelectItem>
                  <SelectItem value="sold-out">Sold out</SelectItem>
                </SelectContent>
              </Select>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Area" />
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
            />
          ))}
        </AnimatedRows>
        {filteredProjects.length === 0 ? (
          <div className="border-border bg-muted/20 mt-4 rounded-xl border p-8 text-center">
            <div className="text-sm font-semibold">No projects match these filters</div>
            <div className="text-muted-foreground mt-1 text-sm">Adjust the filters or reset them to view all projects.</div>
          </div>
        ) : null}
      </PanelTransition>
      </div>
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
