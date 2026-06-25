"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { LayoutGrid, ReceiptText, RotateCcw, Rows3, Search, ShoppingCart, SlidersHorizontal } from "lucide-react"

import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PropertyCard } from "@/components/property/property-card"
import { SellUnitDialog } from "@/components/property/sell-unit-dialog"
import { useLeadsData, useProjectsData, useSalesData } from "@/lib/live-data"
import type { Property, SaleRecord } from "@/lib/data"
import { AnimatedRows, PanelTransition, RevealSection } from "@/motion"

type ApiRecord = Record<string, unknown>
type SalesPanel = "sell" | "history"

export default function SalesPage() {
  const { role = "superadmin" } = useParams()
  const { projects, isFetching } = useProjectsData()
  const { leads } = useLeadsData()
  const { sales, isFetching: isSalesFetching } = useSalesData()
  const [activePanel, setActivePanel] = useState<SalesPanel>("sell")
  const [viewMode, setViewMode] = useState<"row" | "grid">("grid")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [configType, setConfigType] = useState("all")
  const [state, setState] = useState("all")
  const [city, setCity] = useState("all")
  const [area, setArea] = useState("all")
  const [listingType, setListingType] = useState("all")
  const [completion, setCompletion] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [query, setQuery] = useState("")
  const [sellProject, setSellProject] = useState<Property | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState("")

  const sellableProjects = useMemo(
    () => projects.filter((project) => project.status !== "draft" && projectHasAvailableInventory(project)),
    [projects],
  )

  const configTypeOptions = useMemo(
    () => uniqueSorted(sellableProjects.flatMap(projectConfigTypes)),
    [sellableProjects],
  )
  const stateOptions = useMemo(() => uniqueSorted(sellableProjects.map(projectState).filter(Boolean)), [sellableProjects])
  const cityOptions = useMemo(
    () =>
      uniqueSorted(
        sellableProjects
          .filter((project) => state === "all" || sameText(projectState(project), state))
          .map((project) => project.city)
          .filter((value) => value && value !== "-"),
      ),
    [sellableProjects, state],
  )
  const areaOptions = useMemo(
    () =>
      uniqueSorted(
        sellableProjects
          .filter((project) => city === "all" || sameText(project.city, city))
          .map((project) => project.area ?? "")
          .filter(Boolean),
      ),
    [city, sellableProjects],
  )
  const listingTypeOptions = useMemo(
    () => uniqueSorted(sellableProjects.flatMap(projectListingTypes)),
    [sellableProjects],
  )

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...sellableProjects]
      .filter((project) => {
        if (configType !== "all" && !projectConfigTypes(project).some((value) => sameText(value, configType))) return false
        if (state !== "all" && !sameText(projectState(project), state)) return false
        if (city !== "all" && !sameText(project.city, city)) return false
        if (area !== "all" && !sameText(project.area, area)) return false
        if (listingType !== "all" && !projectListingTypes(project).some((value) => sameText(value, listingType))) return false
        if (completion !== "all" && (project.completion ?? projectCompletion(project)) < Number(completion)) return false
        if (needle && !projectSearchText(project).includes(needle)) return false
        return true
      })
      .sort((left, right) => {
        if (sortBy === "price-asc") return left.priceValue - right.priceValue
        if (sortBy === "price-desc") return right.priceValue - left.priceValue
        if (sortBy === "units") return availableCount(right) - availableCount(left)
        if (sortBy === "completion") return (right.completion ?? 0) - (left.completion ?? 0)
        return left.name.localeCompare(right.name)
      })
  }, [area, city, completion, configType, listingType, query, sellableProjects, sortBy, state])

  const salesHistory = useMemo(
    () => [...sales].sort((left, right) => saleTimestamp(right) - saleTimestamp(left)),
    [sales],
  )

  const activeFilterCount = [
    configType !== "all",
    state !== "all",
    city !== "all",
    area !== "all",
    listingType !== "all",
    completion !== "all",
    query.trim() !== "",
  ].filter(Boolean).length

  const resetFilters = () => {
    setConfigType("all")
    setState("all")
    setCity("all")
    setArea("all")
    setListingType("all")
    setCompletion("all")
    setQuery("")
  }

  return (
    <PageContainer className="max-w-[1560px] py-5">
      <div className="reference-page-panel px-10 py-10">
        <PageHeader
          eyebrow="Revenue"
          title="Sales"
          description="Sell available project config units using live backend inventory."
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={activePanel === "sell" ? "default" : "secondary"}
            className="gap-2"
            aria-pressed={activePanel === "sell"}
            onClick={() => setActivePanel("sell")}
          >
            <ShoppingCart className="h-4 w-4" />
            Sell units
          </Button>
          <Button
            type="button"
            variant={activePanel === "history" ? "default" : "secondary"}
            className="gap-2"
            aria-pressed={activePanel === "history"}
            onClick={() => setActivePanel("history")}
          >
            <ReceiptText className="h-4 w-4" />
            Sales history
          </Button>
        </div>

        {activePanel === "sell" ? (
          <>
            <RevealSection className="mt-8">
              <SectionCard contentClassName="p-4 sm:p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="h-10 pl-9"
                        placeholder="Search project, city, area, config"
                      />
                    </div>

                    <Select value={configType} onValueChange={setConfigType}>
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 xl:w-44">
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
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 xl:w-44">
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
                      <SelectTrigger className="h-10 w-full transition-[border-color,box-shadow] duration-150 focus:ring-ring/25 xl:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Sort: Name</SelectItem>
                        <SelectItem value="price-asc">Sort: Price low-high</SelectItem>
                        <SelectItem value="price-desc">Sort: Price high-low</SelectItem>
                        <SelectItem value="units">Sort: Available units</SelectItem>
                        <SelectItem value="completion">Sort: Completion</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 xl:ml-auto">
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
                    <PanelTransition motionKey="sales-more-filters">
                      <div className="border-border/70 grid grid-cols-1 gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Select
                          value={state}
                          onValueChange={(value) => {
                            setState(value)
                            setCity("all")
                            setArea("all")
                          }}
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All states</SelectItem>
                            {stateOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
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
                      </div>
                    </PanelTransition>
                  ) : null}

                  <div className="text-muted-foreground text-right text-xs font-medium">
                    Showing {filteredProjects.length} of {sellableProjects.length} sellable projects
                    {isFetching ? " / refreshing" : ""}
                  </div>
                </div>
              </SectionCard>
            </RevealSection>

            <PanelTransition motionKey={viewMode} className="mt-6">
              <AnimatedRows className={viewMode === "grid" ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "flex flex-col gap-3"}>
                {filteredProjects.map((project) => (
                  <PropertyCard
                    key={project.id}
                    property={project}
                    variant={viewMode}
                    action={
                      <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "flex shrink-0 items-center gap-2"}>
                        <Button asChild variant="secondary" size="sm" className={viewMode === "grid" ? "w-full" : ""}>
                          <Link href={`/${role}/search-property/${project.id}`}>Details</Link>
                        </Button>
                        <Button size="sm" className={viewMode === "grid" ? "w-full gap-1.5" : "gap-1.5"} onClick={() => setSellProject(project)}>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Sell unit
                        </Button>
                      </div>
                    }
                  />
                ))}
              </AnimatedRows>
              {filteredProjects.length === 0 ? (
                <div className="border-border bg-muted/20 mt-4 rounded-xl border p-8 text-center">
                  <div className="text-sm font-semibold">No available units match these filters</div>
                  <div className="text-muted-foreground mt-1 text-sm">Adjust filters or check that project configs have available units.</div>
                </div>
              ) : null}
            </PanelTransition>
          </>
        ) : (
          <SalesHistorySection
            sales={salesHistory}
            selectedSaleId={selectedSaleId}
            isFetching={isSalesFetching}
            onSelectSale={(saleId) => setSelectedSaleId((current) => (current === saleId ? "" : saleId))}
          />
        )}
      </div>

      {sellProject ? (
        <SellUnitDialog
          open={Boolean(sellProject)}
          projectId={sellProject.id}
          initialProject={sellProject}
          leads={leads}
          onOpenChange={(open) => {
            if (!open) setSellProject(null)
          }}
        />
      ) : null}
    </PageContainer>
  )
}

function SalesHistorySection({
  sales,
  selectedSaleId,
  isFetching,
  onSelectSale,
}: {
  sales: SaleRecord[]
  selectedSaleId: string
  isFetching: boolean
  onSelectSale: (saleId: string) => void
}) {
  return (
    <RevealSection className="mt-8">
      <SectionCard contentClassName="p-0">
        <div className="border-border flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-muted-foreground text-xs font-bold uppercase tracking-[0.12em]">Sales history</div>
            <h2 className="mt-1 text-xl font-semibold">Sold config records</h2>
          </div>
          <div className="text-muted-foreground text-xs font-medium">
            Showing {sales.length} sale{sales.length === 1 ? "" : "s"}
            {isFetching ? " / refreshing" : ""}
          </div>
        </div>

        {sales.length ? (
          <div className="divide-border divide-y">
            {sales.map((sale) => {
              const isOpen = selectedSaleId === sale.id
              return (
                <div key={sale.id} className="px-5 py-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-start">
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="text-left text-base font-semibold transition-colors hover:text-primary"
                        onClick={() => onSelectSale(sale.id)}
                      >
                        {sale.project || "Unnamed project"}
                      </button>
                      <div className="text-muted-foreground mt-1 text-sm">{saleConfigBio(sale)}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{sale.buyer || "Buyer pending"}</div>
                      <div className="text-muted-foreground">{[sale.buyerPhone, sale.buyerEmail].filter(Boolean).join(" / ") || "No contact saved"}</div>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="font-mono text-sm font-semibold">{sale.amount || "Price pending"}</div>
                      <div className="text-muted-foreground text-xs">{sale.date || "-"}</div>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-border/70 bg-muted/20 mt-4 grid gap-3 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-3">
                      {saleDetailRows(sale).map((item) => (
                        <div key={item.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
                          <div className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.12em]">{item.label}</div>
                          <div className="mt-1 text-sm font-semibold">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-sm font-semibold">No sales recorded yet</div>
            <div className="text-muted-foreground mt-1 text-sm">Sold config records will appear here after a unit is sold.</div>
          </div>
        )}
      </SectionCard>
    </RevealSection>
  )
}

function saleTimestamp(sale: SaleRecord) {
  const rawDate = sale.raw?.saleDate ?? sale.raw?.createdAt ?? sale.date
  if (typeof rawDate === "number" && Number.isFinite(rawDate)) return rawDate
  if (typeof rawDate !== "string" || !rawDate.trim()) return 0
  const parsed = new Date(rawDate).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function saleConfigBio(sale: SaleRecord) {
  const unit = sale.unitLabel || sale.unitNo || (sale.unitId ? `Unit ${sale.unitId}` : "")
  return [sale.propertyType, sale.config, unit].filter(Boolean).join(" / ") || "Config sold"
}

function saleDetailRows(sale: SaleRecord) {
  return [
    { label: "Project", value: sale.project || "-" },
    { label: "Config sold", value: saleConfigBio(sale) },
    { label: "Buyer", value: sale.buyer || "-" },
    { label: "Buyer phone", value: sale.buyerPhone || "-" },
    { label: "Buyer email", value: sale.buyerEmail || "-" },
    { label: "Final price", value: sale.amount || "-" },
    { label: "Sold by", value: sale.by || "-" },
    { label: "Sold date", value: sale.date || "-" },
    { label: "Listing type", value: sale.listingType ? titleCase(sale.listingType) : "-" },
    { label: "Floor / unit", value: [sale.floorNo, sale.unitNo || sale.unitLabel].filter(Boolean).join(" / ") || "-" },
    { label: "Carpet area", value: formatSqft(sale.carpetAreaSqft) },
    { label: "Saleable area", value: formatSqft(sale.saleableAreaSqft) },
    { label: "Rate per sqft", value: formatMoneyValue(sale.ratePerSqft) },
    { label: "Parking", value: sale.parkingAvailable == null ? "-" : sale.parkingAvailable ? "Available" : "Not available" },
    { label: "Parking price", value: formatMoneyValue(sale.parkingCost) },
    { label: "Completion", value: formatPercent(sale.completionPercentage) },
    { label: "Notes", value: sale.notes || "-" },
  ]
}

function formatSqft(value: number | undefined) {
  return typeof value === "number" && value > 0 ? `${new Intl.NumberFormat("en-IN").format(value)} sqft` : "-"
}

function formatMoneyValue(value: number | undefined) {
  return typeof value === "number" && value > 0 ? `INR ${new Intl.NumberFormat("en-IN").format(value)}` : "-"
}

function formatPercent(value: number | undefined) {
  return typeof value === "number" && value > 0 ? `${value}%` : "-"
}

function projectRecord(project: Property): ApiRecord {
  return project.raw ?? {}
}

function asRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function firstString(record: ApiRecord | null | undefined, keys: string[], fallback = "") {
  if (!record) return fallback
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return fallback
}

function firstNumber(record: ApiRecord | null | undefined, keys: string[], fallback = 0) {
  if (!record) return fallback
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function projectConfigs(project: Property) {
  return asRecords(projectRecord(project).configs)
}

function projectConfigTypes(project: Property) {
  const types = projectConfigs(project).map((config) => firstString(config, ["propertyType", "configType"], ""))
  return types.some(Boolean) ? uniqueSorted(types) : uniqueSorted(project.configTypes ?? [project.config])
}

function projectListingTypes(project: Property) {
  const types = projectConfigs(project).map((config) => firstString(config, ["listingType", "sellingType"], ""))
  return types.some(Boolean) ? uniqueSorted(types) : uniqueSorted(project.listingTypes ?? [])
}

function projectState(project: Property) {
  return firstString(projectRecord(project), ["state", "province"], "")
}

function projectCompletion(project: Property) {
  const configs = projectConfigs(project)
  if (!configs.length) return project.completion ?? 0
  return Math.round(configs.reduce((sum, config) => sum + firstNumber(config, ["completionPercentage", "completion"]), 0) / configs.length)
}

function projectSearchText(project: Property) {
  return [
    project.name,
    project.city,
    project.area,
    project.config,
    projectState(project),
    ...projectConfigTypes(project),
    ...projectListingTypes(project),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function projectHasAvailableInventory(project: Property) {
  const configs = projectConfigs(project)
  if (!configs.length) return availableCount(project) > 0
  return configs.some((config) => {
    const inventory = asRecords(config.unitInventory)
    if (inventory.length) return inventory.some(isAvailableUnit)
    const available = firstNumber(config, ["availableUnits"])
    if (available > 0) return true
    return firstNumber(config, ["units", "totalUnits"]) - firstNumber(config, ["unitsSold", "soldUnits"]) > 0
  })
}

function availableCount(project: Property) {
  const configs = projectConfigs(project)
  if (!configs.length) return Math.max(project.unitsTotal - project.unitsSold, 0)
  return configs.reduce((sum, config) => {
    const inventory = asRecords(config.unitInventory)
    if (inventory.length) return sum + inventory.filter(isAvailableUnit).length
    const available = firstNumber(config, ["availableUnits"])
    if (available > 0) return sum + available
    return sum + Math.max(firstNumber(config, ["units", "totalUnits"]) - firstNumber(config, ["unitsSold", "soldUnits"]), 0)
  }, 0)
}

function isAvailableUnit(unit: ApiRecord) {
  const status = firstString(unit, ["status", "state"], "").toUpperCase()
  if (status) return status === "AVAILABLE"
  return unit.sold !== true && unit.saleId == null
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
    .replace(/\w\S*/g, (word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
}
