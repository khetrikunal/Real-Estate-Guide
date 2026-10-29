"use client"


import { useState, useMemo, use } from "react"
import { Search } from "lucide-react"

import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shell/empty-state"
import { ConfigurationSearchResultCard } from "@/components/property/configuration-search-card"
import { useProjectsData } from "@/lib/live-data"
import type { Property } from "@/lib/data"
import { AnimatedRows, RevealSection } from "@app/motion"
import "./property-view-transitions.css"

type SearchPropertyParams = { role: string } | Promise<{ role: string }>
type ApiRecord = Record<string, unknown>
type SearchableProject = Property & { configs?: ApiRecord[]; raw?: ApiRecord }

type SearchConfigurationResult = {
  id: string
  projectId: string
  configId: string
  projectName: string
  projectStatus: string
  city: string
  area?: string
  address?: string
  pincode?: string
  builderName: string
  cover?: string
  hasCover: boolean
  documentsCount: number
  configLabel: string
  configurationType: string
  propertyType: string
  listingType: string
  price: number
  priceText: string
  areaText: string
  carpetArea?: number
  builtUpArea?: number
  unitsText: string
  parkingText: string
  completionText: string
  searchText: string
  href: string
}

function isPromiseParams(params: SearchPropertyParams): params is Promise<{ role: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records ?? value.configs ?? value.documents
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
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

function formatInr(value: number) {
  return value > 0 ? `INR ${new Intl.NumberFormat("en-IN").format(value)}` : "Price pending"
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}

function parseLooseNumber(value: string) {
  const compact = value.replace(/[^\d.]/g, "")
  if (!compact) return undefined
  const parsed = Number(compact)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parsePriceQuery(value: string) {
  const text = value.toLowerCase()
  const amount = parseLooseNumber(text)
  if (amount === undefined) return undefined
  if (text.includes("crore")) return amount * 10_000_000
  if (text.includes("lakh") || text.includes("lac")) return amount * 100_000
  if (amount >= 100_000) return amount
  return undefined
}

function matchesResultNumber(result: SearchConfigurationResult, value: number) {
  return [
    result.price,
    result.carpetArea,
    result.builtUpArea,
    Number(result.unitsText.match(/\d+/)?.[0]),
    Number(result.completionText.replace("%", "")),
  ].some((candidate) => typeof candidate === "number" && Number.isFinite(candidate) && Math.abs(candidate - value) < 0.01)
}

function configLabel(config: ApiRecord, fallback = "Configuration") {
  const label = firstString(config, ["configLabel", "flatType", "bhk", "type", "configuration", "name"], "")
  const propertyType = firstString(config, ["propertyType", "configType"], "")
  if (label && propertyType && !label.toLowerCase().includes(propertyType.toLowerCase())) return `${propertyType} ${label}`
  return label || propertyType || fallback
}

function configAreaText(config: ApiRecord) {
  const carpetArea = firstNumber(config, ["carpetAreaSqft", "carpetArea", "areaSqft"])
  const builtUpArea = firstNumber(config, ["builtUpAreaSqft", "saleableAreaSqft", "saleableArea", "area"])
  if (carpetArea > 0 && builtUpArea > 0) return `${carpetArea} carpet / ${builtUpArea} built-up sqft`
  if (builtUpArea > 0) return `${builtUpArea} built-up sqft`
  if (carpetArea > 0) return `${carpetArea} carpet sqft`
  return "Area pending"
}

function parkingText(config: ApiRecord) {
  const parking = config.parkingAvailable
  if (parking === true) return "Parking available"
  if (parking === false) return "Parking not available"
  return ""
}

function buildSearchText(result: SearchConfigurationResult) {
  return [
    result.id,
    result.projectId,
    result.configId,
    result.projectName,
    result.projectStatus,
    result.city,
    result.area,
    result.address,
    result.pincode,
    result.builderName,
    result.configLabel,
    result.configurationType,
    result.propertyType,
    result.listingType,
    result.priceText,
    result.price,
    result.areaText,
    result.unitsText,
    result.parkingText,
    result.completionText,
    result.hasCover ? "cover image photo documents" : "no image no documents",
    result.documentsCount > 0 ? "documents files approvals layouts brochure" : "",
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .join(" ")
    .toLowerCase()
}

function baseResultFromProject(project: SearchableProject, config: ApiRecord, configId: string, configIndex: number, role: string) {
  const raw = project.raw ?? {}
  const projectDocuments = asRecords(raw.documents ?? raw.projectDocuments)
  const configDocuments = asRecords(config.documents ?? config.configDocuments)
  const units = firstNumber(config, ["units", "totalUnits", "quantity"], firstNumber(project, ["unitsTotal", "totalUnits"], 0))
  const unitsSold = firstNumber(config, ["unitsSold", "soldUnits"], firstNumber(project, ["unitsSold", "soldUnits"], 0))
  const available = Math.max(units - unitsSold, 0)
  const price = firstNumber(config, ["priceValue", "price", "basePrice", "amount", "rate"], firstNumber(project, ["priceValue", "price", "basePrice", "amount"], 0))
  const propertyType = firstString(config, ["propertyType", "configType"], firstString(project, ["propertyType", "configType"], ""))
  const listingType = titleCase(firstString(config, ["listingType", "sellingType"], firstString(project, ["listingType", "sellingType"], "")))
  const completion = firstNumber(config, ["completionPercentage", "completion"], firstNumber(project, ["completionPercentage", "completion"], 0))
  const cover = project.cover || firstString(raw, ["coverPhotoUrl", "cover", "coverPhoto", "imageUrl", "thumbnailUrl"], "")
  const result: SearchConfigurationResult = {
    id: `${project.id}-${configId || configIndex}`,
    projectId: String(project.id),
    configId,
    projectName: project.name,
    projectStatus: firstString(raw, ["status", "projectStatus"], project.status),
    city: project.city,
    area: project.area,
    address: firstString(raw, ["address", "streetAddress", "location"], project.address),
    pincode: firstString(raw, ["zipCode", "pincode", "postalCode"], project.pincode),
    builderName: firstString(raw, ["builderName", "builder", "developerName", "ownerName"], "-"),
    cover,
    hasCover: Boolean(cover) && !project.noImage,
    documentsCount: projectDocuments.length + configDocuments.length,
    configLabel: configLabel(config, project.config),
    configurationType: propertyType || firstString(config, ["configType"], project.config),
    propertyType,
    listingType,
    price,
    priceText: formatInr(price),
    areaText: configAreaText(config),
    unitsText: units > 0 ? `${available} available / ${unitsSold} sold` : "-",
    parkingText: parkingText(config),
    completionText: completion > 0 ? `${completion}%` : "-",
    carpetArea: firstNumber(config, ["carpetAreaSqft", "carpetArea", "areaSqft"]),
    builtUpArea: firstNumber(config, ["builtUpAreaSqft", "saleableAreaSqft", "saleableArea", "area"]),
    href: `/${role}/search-property/${project.id}`,
    searchText: "",
  }
  result.searchText = buildSearchText(result)
  return result
}

function buildConfigurationResults(projects: Property[], role: string): SearchConfigurationResult[] {
  return projects.flatMap((project, projectIndex) => {
    const searchableProject = project as SearchableProject
    const configs = asRecords(searchableProject.configs)
    if (!configs.length) {
      const fallbackConfig: ApiRecord = {
        configLabel: searchableProject.config,
        propertyType: firstString(searchableProject.raw, ["propertyType", "configType"], ""),
        price: searchableProject.priceValue,
        carpetAreaSqft: 0,
        saleableAreaSqft: 0,
        units: searchableProject.unitsTotal,
        unitsSold: searchableProject.unitsSold,
        completionPercentage: searchableProject.completion,
      }
      return [baseResultFromProject(searchableProject, fallbackConfig, `project-${projectIndex}`, projectIndex, role)]
    }
    return configs.map((config, configIndex) =>
      baseResultFromProject(searchableProject, config, String(config.id ?? config.configId ?? config.configurationId ?? configIndex), configIndex, role),
    )
  })
}

export default function SearchPropertyPage({ params }: { params: SearchPropertyParams }) {
  const { role } = isPromiseParams(params) ? use(params) : params
  const [q, setQ] = useState("")
  const { projects } = useProjectsData()

  const configurationResults = useMemo(() => buildConfigurationResults(projects, role), [projects, role])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    const priceQuery = parsePriceQuery(query)
    const numberQuery = parseLooseNumber(query)

    return configurationResults.filter((result) => {
      const haystack = result.searchText
      if (haystack.includes(query)) return true

      const tokens = query.split(/\s+/).filter(Boolean)
      if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) return true
      if (priceQuery !== undefined && result.price > 0 && Math.abs(result.price - priceQuery) < 1) return true
      if (numberQuery !== undefined) {
        return [result.price, result.carpetArea, result.builtUpArea].some(
          (candidate) => typeof candidate === "number" && Number.isFinite(candidate) && Math.abs(candidate - numberQuery) < 0.01,
        )
      }
      return false
    })
  }, [configurationResults, q])

  return (
    <PageContainer className="max-w-[1560px] py-5">
      <div className="reference-page-panel px-10 py-10">
      <PageHeader
        eyebrow="Discovery"
        title="Search property"
        description="Find matching configurations across every visible project by BHK, price, area, location, builder, or configuration details."
      />

      {/* Hero search */}
      <RevealSection className="mt-8 flex justify-center">
        <div className="relative w-full max-w-2xl">
          <div className="reference-search-glow" />
          <div
            className="reference-search-field surface-elevated focus-within:border-ring/40 focus-within:ring-ring/20 relative flex items-center gap-3 rounded-full border border-border p-2 pl-5 transition-[border-color,box-shadow] duration-150 focus-within:ring-2"
            data-search-state={q.trim() ? "active" : "idle"}
          >
            <Search className="text-muted-foreground h-5 w-5" />
            <Input
              aria-label="Search properties by configuration, price, location, or builder"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 2 BHK, price, carpet area, config name, builder…"
              className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            />
            <kbd className="border-border bg-muted/40 text-muted-foreground mr-1 hidden rounded-full border px-2.5 py-1 font-mono text-[11px] sm:inline-flex">
              ⏎
            </kbd>
          </div>
        </div>
      </RevealSection>

      {/* Results / empty */}
      <div id="property-results" className="mx-auto mt-8 max-w-6xl">
        <div className="mb-3 min-h-5 text-right text-xs font-medium text-muted-foreground">
          {q.trim() && results.length > 0 ? `${results.length} configuration${results.length === 1 ? "" : "s"}` : " "}
        </div>
        {q.trim() === "" ? (
          <EmptyState
            icon={Search}
            title="Start searching"
            description="Search for BHK type, price, carpet/built-up area, configuration name, builder, city, pincode, or any property attribute. Matching configurations appear instantly."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching configurations"
            description={`No configurations found for “${q}”. Try a different BHK type, price, area, builder, or location.`}
          />
        ) : (
          <AnimatedRows className="stagger grid grid-cols-1 gap-4 xl:grid-cols-2">
            {results.map((result) => (
              <ConfigurationSearchResultCard key={result.id} result={result} />
            ))}
          </AnimatedRows>
        )}
      </div>
      </div>
    </PageContainer>
  )
}
