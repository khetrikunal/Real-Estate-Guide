import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import type { AdminUser, FollowUpItem, Lead, Location, Property, PropertyStatus, SaleRecord } from "@/lib/data"
import { ADMINS, AREAS, LEADS, LOCATIONS, PROPERTIES } from "@/lib/data"
import { mediaUrl } from "@/lib/media-url"

type ApiRecord = Record<string, unknown>

const asArray = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records ?? value.users
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const firstString = (record: ApiRecord | null | undefined, keys: string[], fallback = "-") => {
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

const firstPrimitive = (record: ApiRecord | null | undefined, keys: string[]): number | string | undefined => {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return undefined
}

const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))

const sameText = (left: unknown, right: unknown) =>
  typeof left === "string" &&
  typeof right === "string" &&
  left.trim().length > 0 &&
  right.trim().length > 0 &&
  left.trim().toLowerCase() === right.trim().toLowerCase()

const scopeValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const hasAllScope = (values: string[]) =>
  values.some((value) => ["all", "all_locations", "all locations", "*"].includes(value.toLowerCase()))

const matchesAnyScope = (value: unknown, scopes: string[]) => {
  if (scopes.length === 0 || hasAllScope(scopes)) return true
  return scopes.some((scope) => sameText(value, scope))
}

const getRole = (user: ApiRecord | null | undefined, fallbackRole?: string) => firstString(user ?? {}, ["role", "userRole"], fallbackRole ?? "")

const normalizeUserRole = (role: string) => role.toLowerCase().replace(/[_\s-]/g, "")

const isSuperAdmin = (user: ApiRecord | null | undefined, role?: string) => {
  const nextRole = normalizeUserRole(getRole(user, role))
  return nextRole === "superadmin" || nextRole === "superadminuser" || nextRole === "superadministrator"
}


const isAdmin = (user: ApiRecord | null | undefined, role?: string) => {
  const nextRole = normalizeUserRole(getRole(user, role))

  // existing UI normalizes to "Admin"; keep broad matching for safety
  return nextRole === "admin" || nextRole.includes("admin")
}

const isLocationScopedRole = (user: ApiRecord | null | undefined, role?: string) => {
  const nextRole = normalizeRole(getRole(user, role))
  const subscriptionType = firstString(user ?? {}, ["subscriptionType"], "").toLowerCase()
  return (nextRole.includes("subadmin") || nextRole.includes("employee")) && subscriptionType === "location_based"
}

const scopeProjectsForUser = (projects: Property[], user: ApiRecord | null | undefined, role?: string) => {
  // Super Admin + Admin see all projects
  if (isSuperAdmin(user, role) || isAdmin(user, role)) return projects

  // Location-scoped Sub Admin + Employee are filtered
  if (!isLocationScopedRole(user, role)) return projects

  const assignedCity = firstString(user ?? {}, ["assignedCity", "city"], "")
  const assignedArea = firstString(user ?? {}, ["assignedArea", "area"], "")
  const cityScopes = scopeValues(assignedCity)
  const areaScopes = scopeValues(assignedArea)

  // If no assignment exists, default to all (graceful fallback)
  if (!cityScopes.length && !areaScopes.length) return projects

  if (hasAllScope(cityScopes)) return projects

  return projects.filter((project) => {
    return matchesAnyScope(project.city, cityScopes) && matchesAnyScope(project.area, areaScopes)
  })
}

const projectsForUserRequest = (user: ApiRecord | null | undefined, role?: string) => {
  // Super Admin + Admin request full list
  if (isSuperAdmin(user, role) || isAdmin(user, role)) return estateApi.projects.list()

  // Location-scoped roles can use the most efficient endpoint when possible
  if (!isLocationScopedRole(user, role)) return estateApi.projects.list()

  const cityScopes = scopeValues(firstString(user ?? {}, ["assignedCity", "city"], ""))
  const areaScopes = scopeValues(firstString(user ?? {}, ["assignedArea", "area"], ""))

  if (cityScopes.length !== 1 || hasAllScope(cityScopes)) return estateApi.projects.list()

  return estateApi.projects.byCity(
    cityScopes[0],
    areaScopes.length === 1 && !hasAllScope(areaScopes) ? areaScopes[0] : undefined,
  )
}


const fallbackId = (prefix: string) => {
  const randomId = globalThis.crypto?.randomUUID?.()
  if (randomId) return `${prefix}-${randomId}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const formatInr = (value: number) =>
  value > 0 ? `INR ${new Intl.NumberFormat("en-IN").format(value)}` : "Price pending"

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U"

const normalizeStatus = (status: string): PropertyStatus => {
  const next = status.toLowerCase()
  if (next.includes("draft")) return "draft"
  if (next.includes("pending") || next.includes("review")) return "pending"
  return "active"
}

const normalizeLeadStatus = (status: string): Lead["status"] => {
  const next = status.toLowerCase().replace(/[_-]/g, " ")
  if (next.includes("interest")) return "interested"
  if (next.includes("contact")) return "contacted"
  if (next.includes("site") || next.includes("visit")) return "site_visit"
  if (next.includes("negotiat")) return "negotiation"
  if (next.includes("won") || next.includes("booked") || next.includes("closed")) return "won"
  if (next.includes("lost")) return "lost"
  if (next.includes("pending")) return "pending"
  return "new"
}

const normalizeFollowUpStatus = (record: ApiRecord, scheduledAt: string): FollowUpItem["status"] => {
  const status = firstString(record, ["status", "followUpStatus", "state"], "").toLowerCase().replace(/[_-]/g, " ")
  if (status.includes("complete") || status.includes("done") || status.includes("closed")) return "completed"
  if (status.includes("overdue") || status.includes("late") || status.includes("missed")) return "overdue"
  if (status.includes("scheduled") || status.includes("pending") || status.includes("open")) return "scheduled"
  if (record.isCompleted === true || record.completed === true) return "completed"
  const parsed = scheduledAt ? new Date(scheduledAt) : null
  if (parsed && !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now()) return "overdue"
  return "scheduled"
}

const normalizeRole = (role: string): AdminUser["role"] => {
  const next = role.toLowerCase().replace(/[_-]/g, " ")
  if (next.includes("sub")) return "Sub Admin"
  if (next.includes("employee")) return "Employee"
  return "Admin"
}

// NOTE: below helpers implement RBAC for project visibility.
// Keep them separate from `normalizeRole(...)` to avoid name collisions.


const mapProperty = (record: ApiRecord): Property => {
  const configs = asArray(record.configs)

  // --- Defensive config shaping ---
  // We expose raw config records on the Property object (backward compatible)
  // so configuration pages can reliably render them.
  const mappedConfigs = configs.map((config) => {
    const id = firstString(config, ["id", "configurationId", "configId", "configuration_id", "config_id", "_id"], "")
    const name = firstString(config, ["name", "configLabel", "flatType", "type", "label"], "")

    const priceValue =
      firstNumber(config, ["price", "priceValue", "basePrice", "amount", "rate"]) ||
      firstNumber(config, ["amountValue", "totalPrice"], 0)

    return {
      ...config,
      // Normalize common fields so UI code can use consistent access patterns
      id,
      configurationId: id || firstString(config, ["configurationId"], ""),
      name: name || config.configLabel,
      configLabel: name || config.configLabel,
      areaSqft: firstNumber(config, ["areaSqft", "areaSqFt", "area_sqft", "carpetAreaSqft", "carpetAreaSqFt"]),
      area: firstString(config, ["area", "areaLabel", "areaName"], ""),
      priceValue,
      price: config.price ?? (priceValue ? formatInr(priceValue) : undefined),
    }
  })

  const configPrices = mappedConfigs
    .map((config) => firstNumber(config, ["priceValue", "price", "basePrice", "amount", "rate"]))
    .filter((value) => value > 0)

  const priceValue =
    firstNumber(record, ["price", "priceValue", "basePrice", "amount", "rate"]) ||
    (configPrices.length ? Math.min(...configPrices) : 0)

  const unitsTotal =
    firstNumber(record, ["unitsTotal", "totalUnits", "totalFlats", "units", "quantity"]) ||
    mappedConfigs.reduce((sum, config) => {
      const inventoryCount = asArray((config as any).unitInventory).length
      return sum + (firstNumber(config as any, ["units", "totalUnits", "quantity"]) || inventoryCount)
    }, 0)

  const unitsSold =
    firstNumber(record, ["unitsSold", "soldUnits", "sold", "bookedUnits"]) ||
    mappedConfigs.reduce((sum, config) => {
      const inventory = asArray((config as any).unitInventory)
      const soldFromInventory = inventory.filter((unit) => firstString(unit, ["status"], "").toUpperCase() === "SOLD").length
      return sum + (firstNumber(config as any, ["unitsSold", "soldUnits", "sold", "bookedUnits"]) || soldFromInventory)
    }, 0)

  const configTypes = uniqueStrings([
    firstString(record, ["propertyType", "configType"], ""),
    ...mappedConfigs.flatMap((config) => [
      firstString(config as any, ["propertyType", "configType"], ""),
      firstString(config as any, ["configLabel", "flatType", "type"], ""),
    ]),
  ])

  const listingTypes = uniqueStrings([
    firstString(record, ["listingType", "sellingType"], ""),
    ...mappedConfigs.map((config) => firstString(config as any, ["listingType", "sellingType"], "")),
  ])

  const completion =
    firstNumber(record, ["completionPercentage", "completion"]) ||
    (mappedConfigs.length
      ? Math.round(
          mappedConfigs.reduce((sum, config) => sum + firstNumber(config as any, ["completionPercentage", "completion"]), 0) /
            mappedConfigs.length,
        )
      : 0)

  const cover = mediaUrl(firstString(record, ["cover", "coverPhotoUrl", "coverPhoto", "imageUrl", "thumbnailUrl"], ""))

  // NOTE: the local UI Property type does not include `configs`.
  // We still attach it for configuration pages using `(project as any).configs`.
  const property = {
    id: firstString(record, ["id", "projectId", "_id", "uuid"], "") || fallbackId("project"),
    name: firstString(record, ["name", "projectName", "title", "propertyName"], "Untitled project"),
    address: firstString(record, ["address", "streetAddress", "location"], ""),
    city: firstString(record, ["city", "locationCity", "district"], "-"),
    state: firstString(record, ["state", "province"], ""),
    area: firstString(record, ["area", "locality", "locationArea"], ""),
    config:
      firstString(record, ["config", "configuration", "bhk", "propertyType"], "") ||
      firstString(mappedConfigs[0], ["configLabel", "flatType", "type", "propertyType", "configType"], "Configuration pending"),
    configTypes,
    listingTypes,
    price: formatInr(priceValue),
    priceValue,
    status: normalizeStatus(firstString(record, ["status", "projectStatus"], "active")),
    unitsTotal,
    unitsSold,
    completion,
    pincode: firstString(record, ["zipCode", "pincode", "postalCode"], ""),
    cover,
    latitude: firstNumber(record, ["latitude", "lat"]),
    longitude: firstNumber(record, ["longitude", "lng", "lon"]),
    googleMapsUrl: firstString(record, ["googleMapsUrl", "mapUrl", "mapsUrl"], ""),
    noImage: !cover,
    raw: record,
  } as any

  property.configs = mappedConfigs

  return property
}

const mapLead = (record: ApiRecord): Lead => {
  const customer = firstString(record, ["customer", "customerName", "name", "fullName"], "Unnamed lead")
  const assigned = firstString(record, ["assigned", "assignedTo", "assignedUserName", "assignedEmployeeName"], "")
  const project = firstString(record, ["project", "propertyInterest", "projectInterest", "projectName", "propertyName"], "")
  const projectName = firstString(record, ["projectName", "propertyName", "project", "propertyInterest", "projectInterest"], project)
  return {
    id: firstString(record, ["id", "leadId", "_id"], "") || fallbackId("lead"),
    customer,
    customerName: firstString(record, ["customerName", "customer", "name", "fullName"], customer),
    phone: firstString(record, ["phone", "mobile", "contact", "phoneNumber"], "-"),
    email: firstString(record, ["email", "emailAddress"], "-"),
    city: firstString(record, ["city", "location"], "-"),
    status: normalizeLeadStatus(firstString(record, ["status", "leadStatus"], "new")),
    assigned: assigned || null,
    assignedEmployeeName: firstString(record, ["assignedEmployeeName", "assignedUserName", "assigned", "assignedTo"], assigned),
    project: project || undefined,
    projectName: projectName || undefined,
    projectId: firstPrimitive(record, ["projectId", "project_id"]),
    configId: firstPrimitive(record, ["configId", "configurationId", "config_id"]),
    propertyInterest: firstString(record, ["propertyInterest", "projectInterest", "projectName", "propertyName"], project),
    projectInterest: firstString(record, ["projectInterest", "propertyInterest", "projectName", "propertyName"], project),
    createdAt: formatDate(record.createdAt ?? record.createdDate ?? record.date),
    raw: record,
  }
}

const mapFollowUp = (record: ApiRecord): FollowUpItem => {
  const scheduledAt = firstString(record, ["scheduledAt", "when", "scheduledDate", "date"], "")
  const customer = firstString(record, ["customer", "customerName", "leadName", "name"], "Unnamed lead")
  return {
    id: firstString(record, ["id", "followUpId", "_id"], "") || fallbackId("follow-up"),
    leadId: firstString(record, ["leadId", "lead_id"], "-"),
    customer,
    when: formatDate(scheduledAt),
    scheduledAt,
    status: normalizeFollowUpStatus(record, scheduledAt),
    description: firstString(record, ["description", "notes", "note"], ""),
    owner: firstString(record, ["owner", "ownerName", "assignedEmployeeName", "assignedUserName", "createdByName"], ""),
    initials: initials(customer),
    raw: record,
  }
}

const mapSale = (record: ApiRecord): SaleRecord => ({
  id: firstString(record, ["id", "saleId", "_id"], "") || fallbackId("sale"),
  projectId: firstString(record, ["projectId", "project_id"], ""),
  configurationId: firstString(record, ["configurationId", "configId", "configuration_id"], ""),
  unitId: firstString(record, ["unitId", "unit_id"], ""),
  project: firstString(record, ["project", "projectName", "propertyName"], "Unknown project"),
  config: firstString(record, ["config", "configuration", "unitConfig", "configLabel"], "-"),
  propertyType: firstString(record, ["propertyType", "configType"], ""),
  listingType: firstString(record, ["listingType", "sellingType"], ""),
  unitLabel: firstString(record, ["unitLabel"], ""),
  unitNo: firstString(record, ["unitNo", "unitNumber"], ""),
  floorNo: firstString(record, ["floorNo"], ""),
  carpetAreaSqft: firstNumber(record, ["carpetAreaSqft"]),
  saleableAreaSqft: firstNumber(record, ["saleableAreaSqft"]),
  ratePerSqft: firstNumber(record, ["ratePerSqft"]),
  parkingAvailable: typeof record.parkingAvailable === "boolean" ? record.parkingAvailable : undefined,
  parkingCost: firstNumber(record, ["parkingCost"]),
  completionPercentage: firstNumber(record, ["completionPercentage"]),
  units: firstNumber(record, ["units", "quantity", "unitCount"], 1),
  amount: formatInr(firstNumber(record, ["amount", "saleAmount", "totalAmount", "price"])),
  buyer: firstString(record, ["buyer", "buyerName", "customerName"], "") || null,
  buyerPhone: firstString(record, ["buyerPhone", "phone"], ""),
  buyerEmail: firstString(record, ["buyerEmail", "email"], ""),
  notes: firstString(record, ["notes", "note"], ""),
  date: formatDate(record.date ?? record.saleDate ?? record.createdAt),
  by: firstString(record, ["by", "soldBy", "soldByName", "createdBy"], "-"),
  raw: record,
})

const mapUser = (record: ApiRecord): AdminUser => {
  const name = firstString(record, ["name", "fullName", "username", "email"], "Unnamed user")
  return {
    id: firstString(record, ["id", "userId", "_id"], "") || fallbackId("user"),
    name,
    email: firstString(record, ["email", "emailAddress"], "-"),
    phone: firstString(record, ["phone", "mobile", "phoneNumber"], "-"),
    city: firstString(record, ["city", "locationCity"], "-"),
    kyc: firstString(record, ["kyc", "kycStatus"], "pending").toLowerCase().includes("verified") ? "verified" : "pending",
    active: !["false", "inactive", "disabled"].includes(firstString(record, ["active", "status", "enabled"], "true").toLowerCase()),
    role: normalizeRole(firstString(record, ["role", "userRole"], "Admin")),
    initials: initials(name),
  }
}

const mapLocation = (record: ApiRecord): Location => ({
  id: firstString(record, ["id", "locationId", "_id"], "") || fallbackId("location"),
  name: firstString(record, ["locationName", "name", "area"], "Unnamed location"),
  city: firstString(record, ["city"], "-"),
  state: firstString(record, ["state"], "-"),
  area: firstString(record, ["area"], "City-wide"),
  rate: formatInr(firstNumber(record, ["subscriptionRate", "rate", "monthlyRate", "price"])),
})

const mapArea = (record: ApiRecord) => ({
  id: firstString(record, ["id", "areaId", "_id"], "") || fallbackId("area"),
  name: firstString(record, ["name", "area"], "Unnamed area"),
  city: firstString(record, ["city"], "-"),
  state: firstString(record, ["state"], "-"),
})

export function useProjectsData() {
  const { ready, token, user, role } = useAuth()
  const { data = [], isFetching, error } = useQuery({
    queryKey: ["v0", "projects", role, firstString(user ?? {}, ["assignedCity", "city"], ""), firstString(user ?? {}, ["assignedArea", "area"], "")],
    queryFn: async () => asArray(await projectsForUserRequest(user, role)).map(mapProperty),
    initialData: [],
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  const scopedProjects = useMemo(() => scopeProjectsForUser(data, user, role), [data, user, role])
  return { projects: scopedProjects, isFetching, error }
}

export function useLeadsData() {
  const { ready, token } = useAuth()
  const { data = LEADS, isFetching, error } = useQuery({
    queryKey: ["v0", "leads"],
    queryFn: async () => asArray(await estateApi.leads.list()).map(mapLead),
    initialData: LEADS,
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  return { leads: data, isFetching, error }
}

export function useFollowUpsData(from?: string, to?: string) {
  const { ready, token } = useAuth()
  const { data = [], isFetching, error } = useQuery<FollowUpItem[]>({
    queryKey: ["v0", "follow-ups", from ?? "default", to ?? "default"],
    queryFn: async () => {
      const followUpsApi = estateApi.followUps as typeof estateApi.followUps & {
        dashboardFiltered?: (from?: string, to?: string) => Promise<unknown>
      }
      const response =
        typeof followUpsApi.dashboardFiltered === "function"
          ? await followUpsApi.dashboardFiltered(from, to)
          : await estateApi.followUps.dashboardWindow({ from, to })
      return asArray(response).map(mapFollowUp)
    },
    initialData: [],
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  return { followUps: data, isFetching, error }
}

export function useSalesData() {
  const { ready, token } = useAuth()
  const { data = [], isFetching, error } = useQuery({
    queryKey: ["v0", "sales"],
    queryFn: async () => asArray(await estateApi.sales.listFiltered()).map(mapSale),
    initialData: [],
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  return { sales: data, isFetching, error }
}

export function useUsersData() {
  const { ready, token } = useAuth()
  const usersQuery = useQuery({
    queryKey: ["v0", "users", "superadmin"],
    queryFn: async () => {
      const [admins, subAdmins, employees] = await Promise.all([
        estateApi.users.superadmin.admins(),
        estateApi.users.superadmin.subadmins(),
        estateApi.users.superadmin.employees(),
      ])
      return [...asArray(admins), ...asArray(subAdmins), ...asArray(employees)].map(mapUser)
    },
    initialData: ADMINS,
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  const users = usersQuery.data ?? ADMINS
  return {
    admins: users.filter((user) => user.role === "Admin"),
    subAdmins: users.filter((user) => user.role === "Sub Admin"),
    employees: users.filter((user) => user.role === "Employee"),
    isFetching: usersQuery.isFetching,
    error: usersQuery.error,
  }
}

export function useLocationsData() {
  const { ready, token } = useAuth()
  const locationsQuery = useQuery({
    queryKey: ["v0", "locations"],
    queryFn: async () => asArray(await estateApi.locations.list()).map(mapLocation),
    initialData: LOCATIONS,
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  const areasQuery = useQuery({
    queryKey: ["v0", "areas"],
    queryFn: async () => asArray(await estateApi.areas.list()).map(mapArea),
    initialData: AREAS,
    staleTime: 0,
    enabled: ready && Boolean(token),
  })
  return {
    locations: locationsQuery.data ?? LOCATIONS,
    areas: areasQuery.data ?? AREAS,
    isFetching: locationsQuery.isFetching || areasQuery.isFetching,
    error: locationsQuery.error ?? areasQuery.error,
  }
}
