import type { Property } from "@/lib/data"

export type NormalizedConfigurationType = "Flat" | "Land" | "Shop" | "Other" | "Custom"

export type NormalizedConfiguration = {
  id: string
  name: string
  configLabel?: string
  propertyType?: string
  listingType?: string
  configurationType?: NormalizedConfigurationType
  area?: string | number
  areaSqft?: number
  carpetAreaSqft?: number
  saleableAreaSqft?: number
  price?: string
  priceValue?: number
  units?: number
  unitsSold?: number
  completionPercentage?: number
  parkingAvailable?: boolean
  parkingCost?: number
  raw: Record<string, unknown>
}


type ApiRecord = Record<string, unknown>

const isRecord = (value: unknown): value is ApiRecord => typeof value === "object" && value !== null && !Array.isArray(value)

const asRecords = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.configs ?? value.data ?? value.content ?? value.items ?? value.results ?? value.records
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

const firstString = (record: ApiRecord | null | undefined, keys: string[], fallback = "") => {
  if (!record) return fallback
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return fallback
}

const firstNumber = (record: ApiRecord | null | undefined, keys: string[], fallback = 0) => {
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

const formatInr = (value: number) => (value > 0 ? `₹${new Intl.NumberFormat("en-IN").format(value)}` : "")

export function normalizeProjectConfigurations(project: Property | null, fallbackId = "default"): NormalizedConfiguration[] {
  if (!project) return []

  const rawConfigs = asRecords((project as any).configs ?? (project as any).raw?.configs)

  if (rawConfigs.length) {
    return rawConfigs.map((config, index) => normalizeConfiguration(config, project, index))
  }

  return [
    {
      id: `${project.id}-${fallbackId}`,
      name: project.config,
      configLabel: project.config,
      propertyType: firstString(project.raw, ["propertyType", "configType"], project.config),
      listingType: firstString(project.raw, ["listingType", "sellingType"], ""),
    area:
      // `raw` can be arbitrarily typed from multiple backend payload shapes.
      // Normalize `area` into string|number to keep TS happy.
      (() => {
        const rawArea = (project.raw as any)?.area
        if (typeof rawArea === "string" || typeof rawArea === "number") return rawArea
        return project.area
      })(),
      price: project.price,
      priceValue: project.priceValue,
      units: project.unitsTotal,
      unitsSold: project.unitsSold,
      completionPercentage: project.completion,
      raw: project.raw ?? project,
    },
  ]
}

const normalizeConfigurationType = (value: string | undefined | null): NormalizedConfigurationType | undefined => {
  const v = (value ?? "").toString().trim().toLowerCase()
  if (!v) return undefined

  if (v === "flat" || v.includes("flat")) return "Flat"
  if (v === "land" || v.includes("land")) return "Land"
  if (v === "shop" || v.includes("shop")) return "Shop"

  // common custom types from backend might come in as "other" or arbitrary strings
  if (v.includes("other")) return "Other"

  // If it's a non-empty custom string we treat it as Custom
  return "Custom"
}

export function normalizeConfiguration(
  config: ApiRecord,
  project: Property,
  fallbackIndex: number,
): NormalizedConfiguration {
  const id = firstString(config, ["id", "configurationId", "configId", "configuration_id", "config_id", "_id"], "")
  const name = firstString(config, ["name", "configurationName", "configLabel", "flatType", "type", "label"], "")
  const areaSqft = firstNumber(config, ["areaSqft", "areaSqFt", "sqft", "carpetAreaSqft", "carpetAreaSqFt"])
  const priceValue = firstNumber(config, ["priceValue", "price", "basePrice", "amount", "rate"])

  const propertyType = firstString(
    config,
    ["propertyType", "configType", "configurationType"],
    firstString(project.raw, ["propertyType", "configType", "configurationType"], ""),
  )

  // Explicit mapping for Flat/Land/Shop/Other/custom
  const configurationType = normalizeConfigurationType(
    firstString(config, ["configurationType", "configType", "propertyType", "type"], propertyType),
  )

  return {
    ...config,
    id: id || `${project.id}-cfg-${fallbackIndex}`,
    name: name || project.config,
    configLabel: name || firstString(config, ["configLabel"], ""),
    propertyType,
    configurationType,
    listingType: firstString(config, ["listingType", "sellingType"], firstString(project.raw, ["listingType", "sellingType"], "")),
    area: firstString(config, ["area", "areaLabel", "areaName"], ""),
    areaSqft: areaSqft || undefined,
    carpetAreaSqft: firstNumber(config, ["carpetAreaSqft", "carpetArea"]) || undefined,
    saleableAreaSqft: firstNumber(config, ["saleableAreaSqft", "saleableArea"]) || undefined,
    price: firstString(config, ["price"], "") || (priceValue ? formatInr(priceValue) : ""),
    priceValue: priceValue || undefined,
    units: firstNumber(config, ["units", "totalUnits", "quantity"]) || undefined,
    unitsSold: firstNumber(config, ["unitsSold", "soldUnits", "sold", "bookedUnits"]) || undefined,
    completionPercentage: firstNumber(config, ["completionPercentage", "completion"]) || undefined,
    parkingAvailable: typeof config.parkingAvailable === "boolean" ? config.parkingAvailable : undefined,
    parkingCost: firstNumber(config, ["parkingCost", "parkingPrice"]) || undefined,
    raw: config,
  }
}


export function findNormalizedConfiguration(
  project: Property | null,
  configurationId: string,
): NormalizedConfiguration | null {
  const configurations = normalizeProjectConfigurations(project)
  return configurations.find((configuration) => String(configuration.id) === configurationId) ?? null
}

export function getConfigurationLabel(configuration: NormalizedConfiguration | null | undefined) {
  if (!configuration) return "Configuration"

  const label = configuration.name || configuration.configLabel || ""
  const propertyType = configuration.propertyType || ""
  const type = configuration.configurationType

  const effectiveType = type && type !== "Custom" ? type : propertyType

  if (label && effectiveType && !label.toLowerCase().includes(effectiveType.toLowerCase())) {
    return `${effectiveType} ${label}`
  }

  return label || effectiveType || "Configuration"
}

export function getConfigurationTypeBadge(configuration: NormalizedConfiguration | null | undefined): string {
  if (!configuration) return ""
  const t = configuration.configurationType
  if (!t) {
    // fallback
    const pt = configuration.propertyType?.trim()
    return pt || "Other"
  }
  if (t === "Custom") {
    // Prefer showing the backend value in a friendly way
    const pt = configuration.propertyType?.trim()
    return pt ? pt : "Other"
  }
  return t
}


export function getConfigurationArea(configuration: NormalizedConfiguration | null | undefined) {
  if (!configuration) return ""
  const carpet = configuration.carpetAreaSqft ?? firstNumber(configuration.raw, ["carpetAreaSqft", "carpetArea"])
  const saleable = configuration.saleableAreaSqft ?? firstNumber(configuration.raw, ["saleableAreaSqft", "saleableArea"])
  if (carpet > 0 && saleable > 0) return `${carpet} carpet / ${saleable} saleable sqft`
  if (saleable > 0) return `${saleable} saleable sqft`
  if (carpet > 0) return `${carpet} carpet sqft`
  if (configuration.areaSqft) return `${configuration.areaSqft} sqft`
  if (typeof configuration.area === "string" && configuration.area.trim()) return configuration.area
  return "Area pending"
}

export function buildConfigurationDetailRows(configuration: NormalizedConfiguration | null | undefined) {
  if (!configuration) return []

  const raw = configuration.raw
  const hiddenKeys = new Set([
    "raw",
    "configs",
    "documents",
    "unitInventory",
    "_id",
    "id",
    "projectId",
    "configurationId",
    "configId",
  ])

  return Object.entries(raw)
    .filter(([key, value]) => !hiddenKeys.has(key) && !(typeof value === "object" && value !== null && !Array.isArray(value)))
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: formatValue(value),
    }))
}

function humanizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ")
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}
