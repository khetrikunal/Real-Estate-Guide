"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, FileText, ImageIcon, Loader2, MapPin, Plus, Save, Trash2, Wallet, X } from "lucide-react"

import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { MapPickerCard } from "@/components/property/map-picker-card"
import { SectionCard } from "@/components/shell/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { RevealSection } from "@app/motion"
import { mediaUrl } from "@/lib/media-url"
import "@/components/property/add-project-a11y.css"

type RoleParams = { role: string; id?: string } | Promise<{ role: string; id?: string }> 

type SaveState = "idle" | "saving" | "saved"
type PropertyType = "Flat" | "Shop" | "Land" | "Row House" | "Bungalow" | "Other"
type ListingType = "Sell" | "Rent" | "Lease"
type ApiRecord = Record<string, unknown>

type ConfigRow = {
  clientId: string
  propertyType: PropertyType
  floorNo: string
  configLabel: string
  listingType: ListingType
  units: number
  carpetAreaSqft: string
  saleableAreaSqft: string
  parkingAvailable: "yes" | "no" | "unknown"
  parkingCost: string
  completionPercentage: string
  price: string
  documentFiles: File[]
  existingDocuments: ApiRecord[]
}

const propertyTypes: PropertyType[] = ["Flat", "Shop", "Land", "Row House", "Bungalow", "Other"]
const AREA_NONE = "__none__"
const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
]

function isPromiseParams(params: RoleParams): params is Promise<{ role: string; id?: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

function createConfigRow(propertyType: PropertyType): ConfigRow {
  return {
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    propertyType,
    floorNo: "",
    configLabel: propertyType === "Land" ? "Land" : "",
    listingType: "Sell",
    units: 1,
    carpetAreaSqft: "",
    saleableAreaSqft: "",
    parkingAvailable: "unknown",
    parkingCost: "",
    completionPercentage: propertyType === "Land" ? "0" : "100",
    price: "",
    documentFiles: [],
    existingDocuments: [],
  }
}

function numberValue(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

function firstString(record: ApiRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return fallback
}

function numericId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim()
  return ""
}

function slugify(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function projectMatchesRoute(record: ApiRecord, routeId: string) {
  const normalizedRoute = routeId.trim()
  if (!normalizedRoute) return false
  const id = firstString(record, ["id", "projectId", "_id", "uuid"])
  if (id && id === normalizedRoute) return true
  const name = firstString(record, ["projectName", "name", "propertyName", "title"])
  return slugify(name) === slugify(normalizedRoute)
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  )
}

const bhkOptions = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"]
const completionOptions = ["0", "25", "50", "75", "100"]

type PropertyCategory = "Residential" | "Commercial" | "Land"

const residentialSubcategories = [
  "Flats / Apartments",
  "Studio",
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "5 BHK+",
  "Duplex",
  "Triplex",
  "Penthouse",
  "Loft",
  "Villa / Bungalow",
  "Row House",
] as const

const commercialSubcategories = [
  "Shop / Retail",
  "Office",
  "Warehouse / Industrial",
  "Hall / Banquet",
  "Hospitality / Hotel",
  "Institutional / Medical",
  "Other",
] as const

const landSubcategories = [
  "NA Plot",
  "Non-NA Plot",
  "Agricultural Land",
  "MIDC Plot",
  "Commercial Plot",
  "Other",
] as const

function getSubcategoriesFor(category: PropertyCategory): readonly string[] {
  if (category === "Residential") return residentialSubcategories
  if (category === "Commercial") return commercialSubcategories
  return landSubcategories
}

function normalizeProjectStatus(v: string) {
  return v.trim().replace(/\s+/g, "_")
}


function usesBhkType(type: PropertyType) {
  return type === "Flat" || type === "Row House" || type === "Bungalow"
}

function usesNumberField(type: PropertyType) {
  return type !== "Land"
}

function usesUnits(type: PropertyType) {
  return type !== "Land"
}

function usesParking(type: PropertyType) {
  return type === "Flat" || type === "Row House" || type === "Bungalow"
}

function usesCompletion(type: PropertyType) {
  return type !== "Land"
}

function numberFieldLabel(type: PropertyType) {
  if (type === "Shop") return "Shop no"
  if (type === "Row House") return "House no"
  if (type === "Bungalow") return "Bungalow no"
  return "Floor no"
}

function listingOptionsFor(type: PropertyType): ListingType[] {
  return type === "Land" ? ["Sell", "Lease"] : ["Sell", "Rent"]
}

function backendListingType(value: ListingType) {
  if (value === "Rent") return "rental"
  if (value === "Lease") return "lease"
  return "sell"
}

function formListingType(value: unknown): ListingType {
  const normalized = String(value ?? "").toLowerCase()
  if (normalized === "rent" || normalized === "rental") return "Rent"
  if (normalized === "lease") return "Lease"
  return "Sell"
}

function formPropertyType(value: unknown): PropertyType {
  const normalized = String(value ?? "").toLowerCase().replace(/[_-]/g, " ").trim()
  if (normalized === "shop") return "Shop"
  if (normalized === "land" || normalized === "plot") return "Land"
  if (normalized === "row house" || normalized === "rowhouse") return "Row House"
  if (normalized === "bungalow" || normalized === "bunglow") return "Bungalow"
  return "Flat"
}

function configFromProject(record: ApiRecord): ConfigRow {
  const propertyType = formPropertyType(record.propertyType ?? record.configType)
  const parkingAvailable = record.parkingAvailable
  return {
    clientId: `${record.id ?? Date.now()}-${Math.random().toString(36).slice(2)}`,
    propertyType,
    floorNo: firstString(record, ["floorNo", "unitNo", "shopNo", "houseNo", "bungalowNo"]),
    configLabel: firstString(record, ["configLabel", "flatType", "type"], propertyType === "Land" ? "Land" : ""),
    listingType: formListingType(record.listingType ?? record.sellingType),
    units: Math.max(1, Number(record.units ?? record.totalUnits ?? 1) || 1),
    carpetAreaSqft: firstString(record, ["carpetAreaSqft", "carpetArea"]),
    saleableAreaSqft: firstString(record, ["saleableAreaSqft", "saleableArea"]),
    parkingAvailable: parkingAvailable === true ? "yes" : parkingAvailable === false ? "no" : "unknown",
    parkingCost: firstString(record, ["parkingCost", "parkingPrice"]),
    completionPercentage: firstString(record, ["completionPercentage", "completion"], propertyType === "Land" ? "0" : "100"),
    price: firstString(record, ["price", "basePrice", "amount"]),
    documentFiles: [],
    existingDocuments: asRecords(record.documents),
  }
}

function notApplicable(label: string) {
  return <div className="text-muted-foreground rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs">{label}</div>
}

export default function NewProjectPage({ params }: { params: RoleParams }) {
  const { role, id } = isPromiseParams(params) ? use(params) : params

  return <NewProjectContent role={role} editProjectId={id} />
}

function NewProjectContent({ role, editProjectId }: { role: string; editProjectId?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const auth = useAuth()
  const isEditMode = Boolean(editProjectId)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [builderName, setBuilderName] = useState("")
  const [builderNumber, setBuilderNumber] = useState("")

  const [propertyCategory, setPropertyCategory] = useState<"Residential" | "Commercial" | "Land">("Residential")
  const [propertySubcategory, setPropertySubcategory] = useState<string>("")

  const [projectStatus, setProjectStatus] = useState<string>("Ready_to_Move")
  const [possessionDate, setPossessionDate] = useState<string>("")

  const [price, setPrice] = useState<string>("")
  const [pricePerSqFt, setPricePerSqFt] = useState<string>("")
  const [carpetArea, setCarpetArea] = useState<string>("")
  const [builtUpArea, setBuiltUpArea] = useState<string>("")
  const [superBuiltUpArea, setSuperBuiltUpArea] = useState<string>("")

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("Maharashtra")
  const [area, setArea] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [googleMapsUrl, setGoogleMapsUrl] = useState("")
  const [coords, setCoords] = useState({ lat: 18.5204, lng: 73.8567 })
  const [configs, setConfigs] = useState<ConfigRow[]>(() => [createConfigRow("Flat")])
  const [editHydrated, setEditHydrated] = useState(false)
  const isLocationBasedSubadmin =
    auth.role === "subadmin" &&
    String(auth.user?.subscriptionType ?? "").toLowerCase() === "location_based"
  const assignedCity = typeof auth.user?.assignedCity === "string" ? auth.user.assignedCity : ""
  const assignedState = typeof auth.user?.assignedState === "string" ? auth.user.assignedState : ""
  const assignedArea = typeof auth.user?.assignedArea === "string" ? auth.user.assignedArea : ""

  const citiesQuery = useQuery({
    queryKey: ["v0", "locations", "cities", state],
    queryFn: () => estateApi.locations.cities(state),
    enabled: auth.ready && Boolean(auth.token) && Boolean(state),
    staleTime: 30_000,
  })
  const areasQuery = useQuery({
    queryKey: ["v0", "areas", city],
    queryFn: () => estateApi.areas.list(city),
    enabled: auth.ready && Boolean(auth.token) && Boolean(city),
    staleTime: 30_000,
  })
  const editProjectsQuery = useQuery({
    queryKey: ["v0", "project-edit-list"],
    queryFn: () => estateApi.projects.list(),
    enabled: auth.ready && Boolean(auth.token) && isEditMode,
    staleTime: 0,
  })
  const editListProject = useMemo(() => {
    if (!editProjectId) return null
    return asRecords(editProjectsQuery.data).find((record) => projectMatchesRoute(record, editProjectId)) ?? null
  }, [editProjectId, editProjectsQuery.data])
  const resolvedEditProjectId = numericId(editProjectId) || numericId(firstString(editListProject ?? {}, ["id", "projectId", "_id"]))
  const editProjectQuery = useQuery({
    queryKey: ["v0", "project-edit", resolvedEditProjectId || editProjectId],
    queryFn: () => estateApi.projects.detail(resolvedEditProjectId),
    enabled: auth.ready && Boolean(auth.token) && Boolean(resolvedEditProjectId),
    staleTime: 0,
  })

  const cityOptions = useMemo(() => {
    if (isLocationBasedSubadmin && assignedCity) return [assignedCity]
    return uniqueSorted(asRecords(citiesQuery.data).map((record) => firstString(record, ["city", "name"])))
  }, [assignedCity, citiesQuery.data, isLocationBasedSubadmin])

  const areaOptions = useMemo(() => {
    if (isLocationBasedSubadmin && assignedArea) return [assignedArea]
    return uniqueSorted(asRecords(areasQuery.data).map((record) => firstString(record, ["name", "area"])))
  }, [areasQuery.data, assignedArea, isLocationBasedSubadmin])

  useEffect(() => {
    if (!isLocationBasedSubadmin) return
    if (assignedState) setState(assignedState)
    if (assignedCity) setCity(assignedCity)
    if (assignedArea) setArea(assignedArea)
  }, [assignedArea, assignedCity, assignedState, isLocationBasedSubadmin])

  useEffect(() => {
    const editableProject = isRecord(editProjectQuery.data) ? editProjectQuery.data : editListProject
    if (!isEditMode || editHydrated || !isRecord(editableProject)) return
    const project = editableProject

    setPropertyCategory((firstString(project, ["propertyCategory"], "Residential") as any) ?? "Residential")
    setPropertySubcategory(firstString(project, ["propertySubcategory"], ""))
    setProjectStatus(firstString(project, ["projectStatus"], "Ready_to_Move"))
    setPossessionDate(() => {
      const v = project.possessionDate
      if (!v) return ""
      // Expect YYYY-MM-DD from backend
      return String(v).slice(0, 10)
    })
    setPrice(firstString(project, ["price"], ""))
    setPricePerSqFt(firstString(project, ["pricePerSqFt"], ""))
    setCarpetArea(firstString(project, ["carpetArea"], ""))
    setBuiltUpArea(firstString(project, ["builtUpArea"], ""))
    setSuperBuiltUpArea(firstString(project, ["superBuiltUpArea"], ""))

    setProjectName(firstString(project, ["projectName", "name", "propertyName"]))
    setDescription(firstString(project, ["description"]))
    setBuilderName(firstString(project, ["builderName", "builder", "developerName"]))
    setBuilderNumber(firstString(project, ["builderNumber", "builderContact", "builderPhone", "developerPhone"]))
    setAddress(firstString(project, ["address"]))
    setCity(firstString(project, ["city"]))
    setState(firstString(project, ["state"], "Maharashtra"))
    setArea(firstString(project, ["area", "locality"]))
    setZipCode(firstString(project, ["zipCode", "pincode", "postalCode"]))
    setGoogleMapsUrl(firstString(project, ["googleMapsUrl", "mapUrl"]))
    setExistingCoverUrl(mediaUrl(firstString(project, ["coverPhotoUrl", "cover", "coverPhoto", "imageUrl", "thumbnailUrl"])))
    const latitude = Number(project.latitude)
    const longitude = Number(project.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setCoords({ lat: latitude, lng: longitude })
    }
    const loadedConfigs = asRecords(project.configs).map(configFromProject)
    if (loadedConfigs.length) {
      setConfigs(loadedConfigs)
    }
    setEditHydrated(true)
  }, [editHydrated, editListProject, editProjectQuery.data, isEditMode])

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  const totalUnits = useMemo(() => configs.reduce((sum, row) => sum + Math.max(0, Number(row.units) || 0), 0), [configs])

  const updateConfig = (clientId: string, patch: Partial<ConfigRow>) => {
    setConfigs((rows) => rows.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)))
  }

  const addConfigRow = () => {
    setConfigs((rows) => [...rows, createConfigRow("Flat")])
  }

  const removeConfigRow = (clientId: string) => {
    setConfigs((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.clientId !== clientId)))
  }

  const validate = () => {
    if (!projectName.trim()) return "Project name is required."
    if (!address.trim()) return "Address is required."
    if (!city.trim()) return "City is required."
    if (!configs.length) return "At least one configuration is required."
    if (!propertyCategory) return "Property category is required."
    if (!propertySubcategory.trim()) return "Property subcategory is required."
    const incomplete = configs.find((row) => usesBhkType(row.propertyType) && !row.configLabel.trim())

    if (incomplete) return "Each non-land configuration needs a type label."
    const missingPrice = configs.find((row) => numberValue(row.price) <= 0)
    if (missingPrice) return "Each configuration needs a final price."
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaveState("saving")
    setError(null)
    try {
      const normalizedConfigs = configs.map((row) => {
        const saleableAreaSqft = numberValue(row.saleableAreaSqft)
        const configPrice = numberValue(row.price)
        const parkingAvailable = usesParking(row.propertyType) && row.parkingAvailable === "yes"
        return {
          configLabel: row.configLabel.trim() || row.propertyType,
          propertyType: row.propertyType,
          listingType: backendListingType(row.listingType),
          units: usesUnits(row.propertyType) ? Math.max(1, Number(row.units) || 1) : 1,
          unitsSold: 0,
          floorNo: usesNumberField(row.propertyType) ? row.floorNo.trim() : "",
          flatType: usesBhkType(row.propertyType) ? row.configLabel.trim() : "",
          carpetAreaSqft: numberValue(row.carpetAreaSqft),
          saleableAreaSqft,
          ratePerSqft: 0,
          price: configPrice,
          parkingAvailable,
          parkingCost: parkingAvailable ? numberValue(row.parkingCost) : 0,
          completionPercentage: usesCompletion(row.propertyType) ? numberValue(row.completionPercentage) : 0,
        }
      })
      const basePrice = normalizedConfigs.reduce((min, row) => (row.price > 0 && (min === 0 || row.price < min) ? row.price : min), 0)
      const saveProjectId = resolvedEditProjectId || editProjectId
      if (isEditMode && !numericId(saveProjectId)) {
        throw new Error("Could not resolve this project to a backend id. Open the project from the live project list and try again.")
      }
      const projectPayload = {
        projectName: projectName.trim(),
        description: description.trim(),
        builderName: builderName.trim() || undefined,
        builderNumber: builderNumber.trim() || undefined,

        propertyCategory: propertyCategory,
        propertySubcategory: propertySubcategory,
        possessionDate: possessionDate ? possessionDate : undefined,
        projectStatus: normalizeProjectStatus(projectStatus),

        // NOTE: backend payload uses `price` as computed basePrice from configurations.
        // Keep only the computed `price` (basePrice) below.

        pricePerSqft: numberValue(pricePerSqFt),

        carpetArea: numberValue(carpetArea),
        builtUpArea: numberValue(builtUpArea),
        superBuiltUpArea: numberValue(superBuiltUpArea),

        address: address.trim(),
        city: city.trim(),
        area: area.trim() || null,
        state: state.trim(),
        zipCode: zipCode.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        status: "active",
        propertyType: normalizedConfigs[0]?.propertyType,
        listingType: normalizedConfigs[0]?.listingType,
        totalUnits,
        price: basePrice,
        completionPercentage: Math.max(...normalizedConfigs.map((row) => row.completionPercentage), 0),
        configs: normalizedConfigs,
      }

      const project = (isEditMode && saveProjectId
        ? await estateApi.projects.update(saveProjectId, projectPayload)
        : await estateApi.projects.create(projectPayload)) as Record<string, unknown>
      const projectId = project.id ?? project.projectId ?? saveProjectId
      const uploadedBy = auth.user?.id ?? auth.user?.userId

      if (projectId && coverFile) {
        const formData = new FormData()
        formData.append("file", coverFile)
        if (uploadedBy !== undefined && uploadedBy !== null) formData.append("uploadedBy", String(uploadedBy))
        await estateApi.documents.uploadCover(String(projectId), formData)
      }

      if (projectId && Array.isArray(project.configs)) {
        const savedConfigs = project.configs as ApiRecord[]
        await Promise.all(configs.map(async (row, index) => {
          if (row.documentFiles && row.documentFiles.length > 0) {
            const savedConfig = savedConfigs[index]
            if (savedConfig && savedConfig.id) {
              const formData = new FormData()
              row.documentFiles.forEach((file) => formData.append("files", file))
              if (uploadedBy !== undefined && uploadedBy !== null) formData.append("uploadedBy", String(uploadedBy))
              await estateApi.documents.uploadConfigDocs(String(savedConfig.id), formData)
            }
          }
        }))
      }

      setSaveState("saved")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v0", "projects-data"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "project-detail", String(projectId ?? editProjectId ?? "")] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "project-edit", String(projectId ?? editProjectId ?? "")] }),
      ])
      navigate(isEditMode && (projectId || editProjectId) ? `/${role}/search-property/${projectId ?? editProjectId}` : `/${role}/properties`)
    } catch (err) {
      setSaveState("idle")
      setError(err instanceof Error ? err.message : "Could not save project.")
    }
  }

  return (
    <PageContainer className="reference-add-project-page max-w-none px-5 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Properties · New"
        title={isEditMode ? "Edit project" : "Add new project"}
        description={isEditMode ? "Update the project listing and save changes to the backend." : "Create a project listing. You can save as draft and continue later."}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href={`/${role}/properties`}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to properties
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/${role}/properties`}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Link>
            </Button>
            <Button size="sm" className="glow-primary gap-1.5" disabled={saveState === "saving"} onClick={handleSave}>
              {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : isEditMode ? "Save changes" : "Save project"}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-8">
        <div className="flex w-full flex-col gap-6">
          <RevealSection>
            <SectionCard
              eyebrow="Cover"
              title={
                <span className="flex items-center gap-2">
                  <ImageIcon className="text-primary h-4 w-4" /> Project cover photo
                </span>
              }
              description="High-quality cover used in listings, cards, and detail pages."
            >
              <label
                htmlFor="cover"
                className="group border-border bg-muted/30 hover:border-ring/40 hover:bg-muted/50 focus-within:ring-ring/25 flex aspect-[16/7] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed px-6 py-9 text-center transition-[transform,border-color,background-color,box-shadow] duration-200 focus-within:ring-2"
              >
                {coverPreview || existingCoverUrl ? (
                  <img src={coverPreview ?? existingCoverUrl} alt="Selected project cover" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <>
                    <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-sm font-semibold">Drag & drop or tap to upload cover photo</div>
                    <div className="text-muted-foreground min-h-4 text-[11px]">
                      JPG, PNG, WebP · max 5 MB · 16:9 recommended
                    </div>
                  </>
                )}
                <input
                  id="cover"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    if (file && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
                      setError("Cover photo must be JPG, PNG, or WebP.")
                      event.target.value = ""
                      setCoverFile(null)
                      return
                    }
                    setError(null)
                    setCoverFile(file)
                  }}
                />
              </label>
            </SectionCard>
          </RevealSection>

          <RevealSection>
            <SectionCard eyebrow="Basic information" title="Project identity" description="Public-facing name and short description.">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="name" label="Project name / property name">

                    <Input id="name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Enter project or property name" className="h-10 bg-background/50 focus-visible:ring-primary/20 transition-all duration-200" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field id="description" label="Description">
                    <Textarea
                      id="description"
                      rows={4}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="A short overview of the project, amenities, highlights..."
                      className="bg-background/50 focus-visible:ring-primary/20 transition-all duration-200"
                    />
                  </Field>
                </div>
                <Field id="builderName" label="Builder Name">
                  <Input 
                    id="builderName" 
                    value={builderName} 
                    onChange={(event) => setBuilderName(event.target.value)} 
                    placeholder="Enter builder or developer name" 
                    className="h-10 bg-background/50 focus-visible:ring-primary/20 transition-all duration-200" 
                  />
                </Field>
                <Field id="builderNumber" label="Builder Number">
                  <Input 
                    id="builderNumber" 
                    type="tel"
                    value={builderNumber} 
                    onChange={(event) => {
                      const val = event.target.value;
                      if (!val || /^\d*$/.test(val)) {
                        setBuilderNumber(val);
                      }
                    }} 
                    placeholder="10-digit mobile number" 
                    className="h-10 bg-background/50 focus-visible:ring-primary/20 transition-all duration-200" 
                  />
                </Field>
              </div>
            </SectionCard>
          </RevealSection>

          <RevealSection>
            <SectionCard
              eyebrow="Location"
              title={
                <span className="flex items-center gap-2">
                  <MapPin className="text-primary h-4 w-4" /> Address &amp; coordinates
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-5">
                <Field id="address" label="Address">
                  <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, locality, landmark" className="h-10" />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <Field id="state" label="State">
                    <Select
                      value={state}
                      disabled={isLocationBasedSubadmin && Boolean(assignedState)}
                      onValueChange={(value) => {
                        setState(value)
                        setCity("")
                        setArea("")
                      }}
                    >
                      <SelectTrigger id="state" className="h-10 w-full">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {indianStates.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="city" label="City">
                    <Select
                      value={city}
                      disabled={(isLocationBasedSubadmin && Boolean(assignedCity)) || !state}
                      onValueChange={(value) => {
                        setCity(value)
                        setArea("")
                      }}
                    >
                      <SelectTrigger id="city" className="h-10 w-full">
                        <SelectValue placeholder={citiesQuery.isFetching ? "Loading cities..." : "Select city"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="pin" label="Pincode">
                    <Input id="pin" inputMode="numeric" value={zipCode} onChange={(event) => setZipCode(event.target.value)} placeholder="411001" className="h-10" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <Field id="area" label="Area">
                    <Select
                      value={area || AREA_NONE}
                      disabled={(isLocationBasedSubadmin && Boolean(assignedArea)) || !city}
                      onValueChange={(value) => setArea(value === AREA_NONE ? "" : value)}
                    >
                      <SelectTrigger id="area" className="h-10 w-full">
                        <SelectValue placeholder={areasQuery.isFetching ? "Loading areas..." : "No specific area"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AREA_NONE}>No specific area</SelectItem>
                        {areaOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <MapPickerCard value={coords} mapUrl={googleMapsUrl} onChange={setCoords} onMapUrlChange={setGoogleMapsUrl} />
              </div>
            </SectionCard>
          </RevealSection>

          <RevealSection>
            <SectionCard
              eyebrow="Property details"
              title="Property summary"
              description="Category, timeline and summary pricing/area details for the project listing."
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field id="propertyCategory" label="Property Type">
                  <Select value={propertyCategory} onValueChange={(v) => {
                    const next = v as PropertyCategory
                    setPropertyCategory(next)
                    setPropertySubcategory("")
                    setConfigs((rows) => {
                      // keep at least one row; adjust the first config's propertyType to match category
                      const current = rows.length ? rows : [createConfigRow("Flat")]
                      const first = current[0]
                      const desired: PropertyType = next === "Land" ? "Land" : next === "Commercial" ? "Shop" : "Flat"
                      const updatedFirst = { ...first, propertyType: desired, configLabel: desired === "Land" ? "Land" : "" }
                      return [updatedFirst, ...current.slice(1)]
                    })
                  }}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Residential">Residential</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="propertySubcategory" label="Property Subcategory">
                  <Select
                    value={propertySubcategory}
                    onValueChange={(v) => setPropertySubcategory(v)}
                    disabled={!propertyCategory}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubcategoriesFor(propertyCategory).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="projectStatus" label="Property Status">
                  <Select value={projectStatus} onValueChange={(v) => setProjectStatus(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ready_to_Move">Ready to Move</SelectItem>
                      <SelectItem value="Under_Construction">Under Construction</SelectItem>
                      <SelectItem value="New_Launch">New Launch</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="possessionDate" label="Possession Date">
                  <Input
                    id="possessionDate"
                    type="date"
                    value={possessionDate}
                    onChange={(e) => setPossessionDate(e.target.value)}
                    className="h-10"
                  />
                </Field>

                <Field id="price" label="Price">
                  <Input inputMode="decimal" id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Total project price" className="h-10" />
                </Field>

                <Field id="pricePerSqft" label="Price Per Sq.Ft">
                  <Input inputMode="decimal" id="pricePerSqft" value={pricePerSqFt} onChange={(e) => setPricePerSqFt(e.target.value)} placeholder="Price per sqft" className="h-10" />
                </Field>

                <Field id="carpetArea" label="Carpet Area">
                  <Input inputMode="decimal" id="carpetArea" value={carpetArea} onChange={(e) => setCarpetArea(e.target.value)} placeholder="Carpet area" className="h-10" />
                </Field>

                <Field id="builtUpArea" label="Built-Up Area">
                  <Input inputMode="decimal" id="builtUpArea" value={builtUpArea} onChange={(e) => setBuiltUpArea(e.target.value)} placeholder="Built-up area" className="h-10" />
                </Field>

                <Field id="superBuiltUpArea" label="Super Built-Up Area">
                  <Input inputMode="decimal" id="superBuiltUpArea" value={superBuiltUpArea} onChange={(e) => setSuperBuiltUpArea(e.target.value)} placeholder="Super built-up area" className="h-10" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Pricing & configuration"

              title={
                <span className="flex items-center gap-2">
                  <Wallet className="text-primary h-4 w-4" /> Money &amp; units
                </span>
              }
            >
              <div className="rounded-xl border border-border bg-background/50">
                {/* Mobile-first: convert the fixed 1120px table grid into responsive cards. */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-[92px_100px_92px_92px_70px_minmax(100px,1fr)_minmax(110px,1fr)_92px_100px_92px_110px_34px] gap-2 border-b border-border bg-muted/30 px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <div>Config type</div>
                    <div>No / unit</div>
                    <div>Type</div>
                    <div>Selling type</div>
                    <div>Units</div>
                    <div>Carpet area sqft</div>
                    <div>Saleable area sqft</div>
                    <div>Parking</div>
                    <div>Parking price</div>
                    <div>Completion %</div>
                    <div>Config price</div>
                    <div />
                  </div>
                </div>

                <div className="divide-y divide-border md:divide-y-0">
                  {configs.map((row) => (
                    <div key={row.clientId} className="p-3 md:p-0">
                      {/* Desktop row grid */}
                      <div className="hidden md:grid md:grid-cols-[92px_100px_92px_92px_70px_minmax(100px,1fr)_minmax(110px,1fr)_92px_100px_92px_110px_34px] md:items-center md:gap-2 md:py-3 md:px-3 [&_[role=combobox]]:w-full [&_button]:min-w-0 [&_input]:min-w-0 [&_input]:w-full">
                        <Select
                          value={row.propertyType}
                          onValueChange={(value) => {
                            const next = createConfigRow(value as PropertyType)
                            updateConfig(row.clientId, { ...next, clientId: row.clientId })
                          }}
                        >
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>{propertyTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select>
                        {usesNumberField(row.propertyType) ? (
                          <Input value={row.floorNo} onChange={(event) => updateConfig(row.clientId, { floorNo: event.target.value })} placeholder={numberFieldLabel(row.propertyType)} className="h-10" />
                        ) : notApplicable("N/A")}
                        {usesBhkType(row.propertyType) ? (
                          <Select value={row.configLabel} onValueChange={(value) => updateConfig(row.clientId, { configLabel: value })}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="BHK" /></SelectTrigger>
                            <SelectContent>{bhkOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : notApplicable(row.propertyType === "Shop" ? "Shop" : "N/A")}
                        <Select value={row.listingType} onValueChange={(value) => updateConfig(row.clientId, { listingType: value as ListingType })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>{listingOptionsFor(row.propertyType).map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select>
                        {usesUnits(row.propertyType) ? (
                          <Input type="number" min={1} value={row.units} onChange={(event) => updateConfig(row.clientId, { units: Math.max(1, Number(event.target.value) || 1) })} className="h-10" />
                        ) : notApplicable("N/A")}
                        <Input inputMode="decimal" value={row.carpetAreaSqft} onChange={(event) => updateConfig(row.clientId, { carpetAreaSqft: event.target.value })} className="h-10" />
                        <Input inputMode="decimal" value={row.saleableAreaSqft} onChange={(event) => updateConfig(row.clientId, { saleableAreaSqft: event.target.value })} className="h-10" />
                        {usesParking(row.propertyType) ? (
                          <Select value={row.parkingAvailable} onValueChange={(value) => updateConfig(row.clientId, { parkingAvailable: value as ConfigRow["parkingAvailable"], parkingCost: value === "yes" ? row.parkingCost : "" })}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Parking" /></SelectTrigger>
                            <SelectContent><SelectItem value="unknown">Select</SelectItem><SelectItem value="yes">Available</SelectItem><SelectItem value="no">Not available</SelectItem></SelectContent>
                          </Select>
                        ) : notApplicable("N/A")}
                        {usesParking(row.propertyType) && row.parkingAvailable === "yes" ? (
                          <Input inputMode="decimal" value={row.parkingCost} onChange={(event) => updateConfig(row.clientId, { parkingCost: event.target.value })} placeholder="Parking price" className="h-10" />
                        ) : notApplicable("N/A")}
                        {usesCompletion(row.propertyType) ? (
                          <Select value={row.completionPercentage} onValueChange={(value) => updateConfig(row.clientId, { completionPercentage: value })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>{completionOptions.map((value) => <SelectItem key={value} value={value}>{value}%</SelectItem>)}</SelectContent>
                          </Select>
                        ) : notApplicable("N/A")}
                        <Input inputMode="decimal" value={row.price} onChange={(event) => updateConfig(row.clientId, { price: event.target.value })} placeholder="Final price" className="h-10" />
                        <Button type="button" variant="ghost" size="icon" disabled={configs.length === 1} onClick={() => removeConfigRow(row.clientId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {/* Mobile card layout */}
                      <div className="grid gap-3 md:hidden">
                        <div className="grid grid-cols-1 gap-2">
                          <Select
                            value={row.propertyType}
                            onValueChange={(value) => {
                              const next = createConfigRow(value as PropertyType)
                              updateConfig(row.clientId, { ...next, clientId: row.clientId })
                            }}
                          >
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>{propertyTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>

                          {usesNumberField(row.propertyType) ? (
                            <Input value={row.floorNo} onChange={(event) => updateConfig(row.clientId, { floorNo: event.target.value })} placeholder={numberFieldLabel(row.propertyType)} className="h-10" />
                          ) : null}

                          {usesBhkType(row.propertyType) ? (
                            <Select value={row.configLabel} onValueChange={(value) => updateConfig(row.clientId, { configLabel: value })}>
                              <SelectTrigger className="h-10"><SelectValue placeholder="BHK" /></SelectTrigger>
                              <SelectContent>{bhkOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : null}

                          <Select value={row.listingType} onValueChange={(value) => updateConfig(row.clientId, { listingType: value as ListingType })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>{listingOptionsFor(row.propertyType).map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>

                          {usesUnits(row.propertyType) ? (
                            <Input type="number" min={1} value={row.units} onChange={(event) => updateConfig(row.clientId, { units: Math.max(1, Number(event.target.value) || 1) })} className="h-10" />
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <Input inputMode="decimal" value={row.carpetAreaSqft} onChange={(event) => updateConfig(row.clientId, { carpetAreaSqft: event.target.value })} placeholder="Carpet area (sqft)" className="h-10" />
                          <Input inputMode="decimal" value={row.saleableAreaSqft} onChange={(event) => updateConfig(row.clientId, { saleableAreaSqft: event.target.value })} placeholder="Saleable area (sqft)" className="h-10" />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {usesParking(row.propertyType) ? (
                            <Select value={row.parkingAvailable} onValueChange={(value) => updateConfig(row.clientId, { parkingAvailable: value as ConfigRow["parkingAvailable"], parkingCost: value === "yes" ? row.parkingCost : "" })}>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Parking" /></SelectTrigger>
                              <SelectContent><SelectItem value="unknown">Select</SelectItem><SelectItem value="yes">Available</SelectItem><SelectItem value="no">Not available</SelectItem></SelectContent>
                            </Select>
                          ) : null}

                          {usesParking(row.propertyType) && row.parkingAvailable === "yes" ? (
                            <Input inputMode="decimal" value={row.parkingCost} onChange={(event) => updateConfig(row.clientId, { parkingCost: event.target.value })} placeholder="Parking price" className="h-10" />
                          ) : null}

                          {usesCompletion(row.propertyType) ? (
                            <Select value={row.completionPercentage} onValueChange={(value) => updateConfig(row.clientId, { completionPercentage: value })}>
                              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                              <SelectContent>{completionOptions.map((value) => <SelectItem key={value} value={value}>{value}%</SelectItem>)}</SelectContent>
                            </Select>
                          ) : null}

                          <Input inputMode="decimal" value={row.price} onChange={(event) => updateConfig(row.clientId, { price: event.target.value })} placeholder="Final price" className="h-10" />
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <Button type="button" variant="ghost" size="icon" disabled={configs.length === 1} onClick={() => removeConfigRow(row.clientId)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Config Documents Upload */}
                      <div className="mt-4 md:mx-3 md:mb-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            {row.configLabel || row.propertyType} Documents
                          </Label>
                          <label className="cursor-pointer text-xs font-medium text-primary hover:underline">
                            Upload Files
                            <input
                              type="file"
                              multiple
                              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const newFiles = Array.from(e.target.files ?? [])
                                updateConfig(row.clientId, { documentFiles: [...row.documentFiles, ...newFiles] })
                                e.target.value = ""
                              }}
                            />
                          </label>
                        </div>
                        {row.existingDocuments.length > 0 || row.documentFiles.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {row.existingDocuments.map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2 text-xs shadow-sm">
                                <span className="truncate">{doc.fileName || "Document"}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10"
                                  onClick={async () => {
                                    try {
                                      const configId = numericId(doc.configId)
                                      if (configId && doc.id) {
                                        await estateApi.documents.deleteConfigDoc(configId, doc.id)
                                        updateConfig(row.clientId, {
                                          existingDocuments: row.existingDocuments.filter((d: any) => d.id !== doc.id)
                                        })
                                      }
                                    } catch (err) {
                                      setError("Failed to delete document")
                                    }
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            {row.documentFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2 text-xs shadow-sm">
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    updateConfig(row.clientId, {
                                      documentFiles: row.documentFiles.filter((_, i) => i !== idx)
                                    })
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-muted-foreground">
                            No documents added
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" className="mt-4 gap-1.5" onClick={addConfigRow}>
                <Plus className="h-3.5 w-3.5" />
                Add Config Row
              </Button>
            </SectionCard>
          </RevealSection>

        </div>
      </div>
    </PageContainer>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {label}
      </Label>
      {children}
    </div>
  )
}
