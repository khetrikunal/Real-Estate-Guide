"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { use, useMemo, useState } from "react"
import { notFound } from "next/navigation"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { PageContainer } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatusPill } from "@/components/shell/status-pill"
import { ProjectDocumentsPanel } from "@/components/property/project-documents-panel"
import { SellUnitDialog } from "@/components/property/sell-unit-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLeadsData, useProjectsData } from "@/lib/live-data"
import { mediaUrl } from "@/lib/media-url"
import { getPropertyViewTransitionName, OperationalKpiGroup, PanelTransition, RevealSection } from "@app/motion"
import "../property-view-transitions.css"

type DetailParams = { role: string; id: string } | Promise<{ role: string; id: string }>
type ApiRecord = Record<string, unknown>
type StatusTone = "neutral" | "primary" | "success" | "warning" | "info" | "danger"

function isPromiseParams(params: DetailParams): params is Promise<{ role: string; id: string }> {
  return typeof (params as Promise<{ role: string; id: string }>).then === "function"
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records ?? value.configs
    if (Array.isArray(nested)) return nested.filter(isRecord)
  }
  return []
}

function firstString(record: ApiRecord | null | undefined, keys: string[], fallback = "-") {
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

function firstBoolean(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "boolean") return value
    if (typeof value === "string" && value.trim()) return ["true", "yes", "available"].includes(value.toLowerCase())
  }
  return undefined
}

function formatInr(value: number) {
  return value > 0 ? `₹${new Intl.NumberFormat("en-IN").format(value)}` : "Price pending"
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}

function statusTone(status: string): StatusTone {
  const normalized = status.toLowerCase()
  if (normalized.includes("sold") || normalized.includes("closed") || normalized.includes("inactive")) return "danger"
  if (normalized.includes("draft") || normalized.includes("under") || normalized.includes("pending")) return "warning"
  if (normalized.includes("active") || normalized.includes("ready") || normalized.includes("move")) return "success"
  return "primary"
}

function idsMatch(left: unknown, right: unknown) {
  return left != null && right != null && String(left) === String(right)
}

function namesMatch(left: unknown, right: unknown) {
  return (
    typeof left === "string" &&
    typeof right === "string" &&
    left.trim().length > 0 &&
    left.trim().toLowerCase() === right.trim().toLowerCase()
  )
}

function configLabel(config: ApiRecord) {
  const label = firstString(config, ["configLabel", "flatType", "type", "configuration"], "")
  const propertyType = firstString(config, ["propertyType", "configType"], "")
  if (label && propertyType && !label.toLowerCase().includes(propertyType.toLowerCase())) return `${propertyType} ${label}`
  return label || propertyType || "Configuration"
}

function configArea(config: ApiRecord) {
  const carpet = firstNumber(config, ["carpetAreaSqft", "carpetArea"])
  const saleable = firstNumber(config, ["saleableAreaSqft", "saleableArea"])
  if (carpet > 0 && saleable > 0) return `${carpet} carpet / ${saleable} saleable sqft`
  if (saleable > 0) return `${saleable} saleable sqft`
  if (carpet > 0) return `${carpet} carpet sqft`
  return "Area pending"
}

const PROPERTY_TYPES = ["Flat", "Shop", "Land", "Row House", "Bungalow", "Other"]
const RESIDENTIAL_PRESETS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "Studio", "Penthouse", "Duplex", "Villa"]
const COMMERCIAL_PRESETS = ["Shop", "Office", "Showroom", "Warehouse", "Hall", "Commercial Unit"]
const LAND_PRESETS = ["Plot", "Agricultural Land", "Commercial Plot", "Industrial Plot"]

type ConfigFormData = {
  propertyType: string
  floorNo: string
  configLabel: string
  units: number
  unitNumbers: string
  carpetAreaSqft: string
  saleableAreaSqft: string
  price: string
  ratePerSqft: string
  parkingAvailable: boolean
  parkingCost: string
  completionPercentage: string
  listingType: "Sell" | "Rent" | "Lease"
}

const initialConfigForm: ConfigFormData = {
  propertyType: "Flat",
  floorNo: "1st Floor",
  configLabel: "2 BHK",
  units: 4,
  unitNumbers: "101, 102, 103, 104",
  carpetAreaSqft: "650",
  saleableAreaSqft: "850",
  price: "4500000",
  ratePerSqft: "5294",
  parkingAvailable: true,
  parkingCost: "0",
  completionPercentage: "100",
  listingType: "Sell",
}

export default function PropertyDetailPage({
  params,
  initialTab = "details",
}: {
  params: DetailParams
  initialTab?: "details" | "configs" | "documents" | "sell"
}) {
  const { role, id } = isPromiseParams(params) ? use(params) : params
  return <PropertyDetailContent role={role} id={id} initialTab={initialTab} />
}

function PropertyDetailContent({ role, id, initialTab }: { role: string; id: string; initialTab: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ready, token } = useAuth()
  const { projects, isFetching: isProjectsFetching } = useProjectsData()
  const { leads } = useLeadsData()

  const [activeTab, setActiveTab] = useState(initialTab)
  const [sellDialogOpen, setSellDialogOpen] = useState(false)

  // Configuration management modals
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [editingConfigIndex, setEditingConfigIndex] = useState<number | null>(null)
  const [configForm, setConfigForm] = useState<ConfigFormData>(initialConfigForm)
  const [configFormError, setConfigFormError] = useState<string | null>(null)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  // Configuration delete modal
  const [deleteConfigIndex, setDeleteConfigIndex] = useState<number | null>(null)
  const [isDeletingConfig, setIsDeletingConfig] = useState(false)

  // Project delete modal
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)

  // Floor filter for configurations tab
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>("all")

  const listProperty = projects.find((p) => p.id === id)
  const projectQuery = useQuery({
    queryKey: ["v0", "project-detail", id],
    queryFn: () => estateApi.projects.detail(id),
    enabled: ready && Boolean(token) && Boolean(id),
    staleTime: 0,
  })

  const project = isRecord(projectQuery.data) ? projectQuery.data : null
  const projectName = firstString(project, ["projectName", "name", "propertyName"], listProperty?.name ?? "Untitled project")
  const projectId = String(project?.id ?? listProperty?.id ?? id)

  const matchingLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (idsMatch(lead.projectId, projectId)) return true
        if (namesMatch(lead.projectName, projectName)) return true
        if (namesMatch(lead.propertyInterest, projectName)) return true
        if (namesMatch(lead.projectInterest, projectName)) return true
        return namesMatch(lead.project, projectName)
      }),
    [leads, projectId, projectName],
  )

  const isLoading = !ready || projectQuery.isLoading || (isProjectsFetching && !listProperty)
  if (!project && !listProperty && isLoading) {
    return (
      <PageContainer>
        <SectionCard eyebrow="Property" title="Loading project details" description="Fetching live building details and configurations." />
      </PageContainer>
    )
  }
  if (!project && !listProperty) notFound()

  const rawConfigs = asRecords(project?.configs)
  const documents = asRecords(project?.documents)
  const sales = asRecords(project?.sales)

  const city = firstString(project, ["city"], listProperty?.city ?? "-")
  const area = firstString(project, ["area"], listProperty?.area ?? "")
  const state = firstString(project, ["state"], "")
  const builderName = firstString(project, ["builderName", "builder", "developerName"], "")
  const builderNumber = firstString(project, ["builderNumber", "builderContact", "builderPhone"], "")
  const googleMapsUrl = firstString(project, ["googleMapsUrl", "mapUrl"], "")
  const possessionDate = project?.possessionDate ? String(project.possessionDate).slice(0, 10) : ""

  const statusRaw = firstString(project, ["projectStatus", "status"], listProperty?.status ?? "Ready_to_Move")
  const statusLabel = statusRaw.replace(/_/g, " ")

  const propertyCategory = firstString(project, ["propertyCategory"], "Residential")
  const propertySubcategory = firstString(project, ["propertySubcategory"], "")

  // Calculations for configs and units
  const total =
    firstNumber(project, ["totalUnits", "unitsTotal"]) ||
    rawConfigs.reduce((sum, config) => sum + firstNumber(config, ["units", "totalUnits"]), 0) ||
    listProperty?.unitsTotal ||
    0

  const sold =
    firstNumber(project, ["unitsSold", "soldUnits"]) ||
    rawConfigs.reduce((sum, config) => sum + firstNumber(config, ["unitsSold", "soldUnits"]), 0) ||
    listProperty?.unitsSold ||
    0

  const available = Math.max(total - sold, 0)
  const pct = total > 0 ? (sold / total) * 100 : 0

  const basePriceValue =
    firstNumber(project, ["price", "basePrice", "priceValue"]) ||
    rawConfigs.reduce((lowest, config) => {
      const p = firstNumber(config, ["price", "basePrice", "amount"])
      if (p <= 0) return lowest
      return lowest === 0 ? p : Math.min(lowest, p)
    }, 0)

  // Breakdown of Flats vs Commercial
  const residentialUnits = rawConfigs
    .filter((c) => {
      const t = firstString(c, ["propertyType"], "").toLowerCase()
      return t === "flat" || t === "row house" || t === "bungalow"
    })
    .reduce((sum, c) => sum + firstNumber(c, ["units", "totalUnits"], 1), 0)

  const commercialUnits = rawConfigs
    .filter((c) => {
      const t = firstString(c, ["propertyType"], "").toLowerCase()
      return t === "shop" || t === "commercial" || t === "office"
    })
    .reduce((sum, c) => sum + firstNumber(c, ["units", "totalUnits"], 1), 0)

  const uniqueFloors = Array.from(
    new Set(
      rawConfigs
        .map((c) => firstString(c, ["floorNo", "unitNo"], "").trim())
        .filter(Boolean),
    ),
  )

  const filteredConfigs = useMemo(() => {
    if (selectedFloorFilter === "all") return rawConfigs
    return rawConfigs.filter((c) => firstString(c, ["floorNo", "unitNo"], "").trim() === selectedFloorFilter)
  }, [rawConfigs, selectedFloorFilter])

  const coverPhoto = mediaUrl(firstString(project, ["coverPhotoUrl", "cover", "coverPhoto", "imageUrl", "thumbnailUrl"], listProperty?.cover ?? ""))
  const address = firstString(project, ["address"], [city, area].filter(Boolean).join(", ") || "-")
  const pincode = firstString(project, ["zipCode", "pincode", "postalCode"], "-")
  const description = firstString(project, ["description"], "")

  const owner = firstString(project, ["addedByName", "uploadedByName", "ownerName"], "-")
  const lastEditor = firstString(project, ["modifiedByName"], owner)

  const completion =
    firstNumber(project, ["completionPercentage", "completion"]) ||
    (rawConfigs.length
      ? Math.round(
          rawConfigs.reduce((sum, config) => sum + firstNumber(config, ["completionPercentage", "completion"]), 0) /
            rawConfigs.length,
        )
      : 0)

  const propertyTransitionName = getPropertyViewTransitionName(String(projectId))

  // Smart unit number generator
  const generateUnitNumbers = (floor: string, count: number) => {
    const floorDigits = floor.replace(/\D/g, "")
    const prefix = floor.toLowerCase().includes("ground") || floorDigits === "" || floorDigits === "0" ? "G-" : `${floorDigits}0`
    const items: string[] = []
    for (let i = 1; i <= count; i++) {
      if (prefix === "G-") {
        items.push(`G-${i}`)
      } else {
        items.push(`${floorDigits}${i < 10 ? `0${i}` : i}`)
      }
    }
    return items.join(", ")
  }

  // Open add dialog
  const handleOpenAddConfig = (suggestedFloor?: string) => {
    setEditingConfigIndex(null)
    const defaultFloor = suggestedFloor || (uniqueFloors.length > 0 ? `Floor ${uniqueFloors.length + 1}` : "1st Floor")
    const unitsCount = 4
    setConfigForm({
      propertyType: "Flat",
      floorNo: defaultFloor,
      configLabel: "2 BHK",
      units: unitsCount,
      unitNumbers: generateUnitNumbers(defaultFloor, unitsCount),
      carpetAreaSqft: "650",
      saleableAreaSqft: "850",
      price: "4500000",
      ratePerSqft: "5294",
      parkingAvailable: true,
      parkingCost: "0",
      completionPercentage: "100",
      listingType: "Sell",
    })
    setConfigFormError(null)
    setConfigDialogOpen(true)
  }

  // Open edit dialog
  const handleOpenEditConfig = (index: number) => {
    const target = rawConfigs[index]
    if (!target) return
    setEditingConfigIndex(index)
    const priceVal = firstNumber(target, ["price", "basePrice", "amount"], 0)
    const saleableVal = firstNumber(target, ["saleableAreaSqft", "saleableArea"], 0)
    const rateVal = firstNumber(target, ["ratePerSqft"], saleableVal > 0 && priceVal > 0 ? Math.round(priceVal / saleableVal) : 0)

    setConfigForm({
      propertyType: firstString(target, ["propertyType"], "Flat"),
      floorNo: firstString(target, ["floorNo", "unitNo"], "1st Floor"),
      configLabel: firstString(target, ["configLabel", "flatType", "type"], "2 BHK"),
      units: firstNumber(target, ["units", "totalUnits"], 1),
      unitNumbers: firstString(target, ["unitNumbers", "unitLabels"], ""),
      carpetAreaSqft: String(firstNumber(target, ["carpetAreaSqft", "carpetArea"], 0) || ""),
      saleableAreaSqft: String(saleableVal || ""),
      price: String(priceVal || ""),
      ratePerSqft: String(rateVal || ""),
      parkingAvailable: firstBoolean(target, ["parkingAvailable", "parking"]) ?? true,
      parkingCost: String(firstNumber(target, ["parkingCost", "parkingPrice"], 0) || ""),
      completionPercentage: String(firstNumber(target, ["completionPercentage", "completion"], 100)),
      listingType: (firstString(target, ["listingType"], "Sell") as any) ?? "Sell",
    })
    setConfigFormError(null)
    setConfigDialogOpen(true)
  }

  // Duplicate configuration
  const handleDuplicateConfig = (index: number) => {
    const target = rawConfigs[index]
    if (!target) return
    setEditingConfigIndex(null)

    const prevFloor = firstString(target, ["floorNo", "unitNo"], "1st Floor")
    const floorNum = parseInt(prevFloor.replace(/\D/g, ""), 10)
    const nextFloor = !isNaN(floorNum) ? `${floorNum + 1}${floorNum + 1 === 2 ? "nd" : floorNum + 1 === 3 ? "rd" : "th"} Floor` : `${prevFloor} (Copy)`
    const unitsCount = firstNumber(target, ["units", "totalUnits"], 4)

    setConfigForm({
      propertyType: firstString(target, ["propertyType"], "Flat"),
      floorNo: nextFloor,
      configLabel: firstString(target, ["configLabel", "flatType", "type"], "2 BHK"),
      units: unitsCount,
      unitNumbers: generateUnitNumbers(nextFloor, unitsCount),
      carpetAreaSqft: String(firstNumber(target, ["carpetAreaSqft", "carpetArea"], 0) || ""),
      saleableAreaSqft: String(firstNumber(target, ["saleableAreaSqft", "saleableArea"], 0) || ""),
      price: String(firstNumber(target, ["price", "basePrice", "amount"], 0) || ""),
      ratePerSqft: String(firstNumber(target, ["ratePerSqft"], 0) || ""),
      parkingAvailable: firstBoolean(target, ["parkingAvailable", "parking"]) ?? true,
      parkingCost: String(firstNumber(target, ["parkingCost", "parkingPrice"], 0) || ""),
      completionPercentage: String(firstNumber(target, ["completionPercentage", "completion"], 100)),
      listingType: (firstString(target, ["listingType"], "Sell") as any) ?? "Sell",
    })
    setConfigFormError(null)
    setConfigDialogOpen(true)
  }

  // Save config (Add or Edit)
  const handleSaveConfig = async () => {
    if (!configForm.configLabel.trim()) {
      setConfigFormError("Configuration label is required (e.g. 2 BHK, Shop 101)")
      return
    }
    if (configForm.units < 1) {
      setConfigFormError("Units count must be at least 1")
      return
    }

    setIsSavingConfig(true)
    setConfigFormError(null)

    try {
      const priceNum = Number(configForm.price) || 0
      const saleableNum = Number(configForm.saleableAreaSqft) || 0
      const rateNum = Number(configForm.ratePerSqft) || (saleableNum > 0 && priceNum > 0 ? Math.round(priceNum / saleableNum) : 0)

      const normalizedConfigPayload: ApiRecord = {
        configLabel: configForm.configLabel.trim(),
        propertyType: configForm.propertyType,
        listingType: configForm.listingType.toLowerCase() === "rent" ? "rental" : configForm.listingType.toLowerCase() === "lease" ? "lease" : "sell",
        units: configForm.units,
        unitsSold: editingConfigIndex !== null ? firstNumber(rawConfigs[editingConfigIndex], ["unitsSold"], 0) : 0,
        floorNo: configForm.floorNo.trim(),
        flatType: configForm.propertyType === "Flat" ? configForm.configLabel.trim() : "",
        carpetAreaSqft: Number(configForm.carpetAreaSqft) || 0,
        saleableAreaSqft: saleableNum,
        ratePerSqft: rateNum,
        price: priceNum,
        parkingAvailable: configForm.parkingAvailable,
        parkingCost: configForm.parkingAvailable ? Number(configForm.parkingCost) || 0 : 0,
        completionPercentage: Number(configForm.completionPercentage) || 0,
        unitNumbers: configForm.unitNumbers.trim() || undefined,
      }

      const updatedConfigs = [...rawConfigs]
      if (editingConfigIndex !== null) {
        updatedConfigs[editingConfigIndex] = {
          ...updatedConfigs[editingConfigIndex],
          ...normalizedConfigPayload,
        }
      } else {
        updatedConfigs.push(normalizedConfigPayload)
      }

      const totalCalculatedUnits = updatedConfigs.reduce((sum, c) => sum + firstNumber(c, ["units", "totalUnits"], 1), 0)
      const lowestPrice = updatedConfigs.reduce((min, c) => {
        const p = firstNumber(c, ["price", "basePrice", "amount"], 0)
        if (p > 0 && (min === 0 || p < min)) return p
        return min
      }, 0)

      const projectPayload: ApiRecord = {
        projectName,
        address,
        city,
        state,
        area,
        zipCode: pincode !== "-" ? pincode : undefined,
        googleMapsUrl,
        builderName: builderName || undefined,
        builderNumber: builderNumber || undefined,
        propertyCategory,
        propertySubcategory,
        projectStatus: statusRaw,
        description,
        totalUnits: totalCalculatedUnits,
        price: lowestPrice,
        configs: updatedConfigs,
      }

      await estateApi.projects.update(projectId, projectPayload)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v0", "project-detail", String(projectId)] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects-data"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects"] }),
      ])

      setConfigDialogOpen(false)
      setActiveTab("configs")
    } catch (err) {
      setConfigFormError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setIsSavingConfig(false)
    }
  }

  // Delete config
  const handleConfirmDeleteConfig = async () => {
    if (deleteConfigIndex === null) return
    setIsDeletingConfig(true)

    try {
      const updatedConfigs = rawConfigs.filter((_, idx) => idx !== deleteConfigIndex)
      const totalCalculatedUnits = updatedConfigs.reduce((sum, c) => sum + firstNumber(c, ["units", "totalUnits"], 1), 0)
      const lowestPrice = updatedConfigs.reduce((min, c) => {
        const p = firstNumber(c, ["price", "basePrice", "amount"], 0)
        if (p > 0 && (min === 0 || p < min)) return p
        return min
      }, 0)

      const projectPayload: ApiRecord = {
        projectName,
        address,
        city,
        state,
        area,
        zipCode: pincode !== "-" ? pincode : undefined,
        googleMapsUrl,
        builderName: builderName || undefined,
        builderNumber: builderNumber || undefined,
        propertyCategory,
        propertySubcategory,
        projectStatus: statusRaw,
        description,
        totalUnits: totalCalculatedUnits,
        price: lowestPrice,
        configs: updatedConfigs,
      }

      await estateApi.projects.update(projectId, projectPayload)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v0", "project-detail", String(projectId)] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects-data"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects"] }),
      ])

      setDeleteConfigIndex(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete configuration")
    } finally {
      setIsDeletingConfig(false)
    }
  }

  // Delete entire project
  const handleConfirmDeleteProject = async () => {
    setIsDeletingProject(true)
    try {
      await estateApi.projects.remove(projectId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v0", "projects-data"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects"] }),
      ])
      navigate(`/${role}/properties`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete project")
      setIsDeletingProject(false)
    }
  }

  return (
    <PageContainer className="max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href={`/${role}/properties`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="glow-primary gap-1.5"
            onClick={() => handleOpenAddConfig()}
          >
            <Plus className="h-4 w-4" />
            Add Configuration / Floor
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/${role}/properties/${projectId}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Building Info
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={() => setDeleteProjectDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Hero Building Header Card */}
      <RevealSection
        className="surface-elevated border-border relative mt-4 overflow-hidden rounded-2xl border"
        style={{ viewTransitionName: propertyTransitionName } as CSSProperties}
      >
        <div className="bg-muted/30 relative h-60 sm:h-72">
          {coverPhoto ? (
            <img src={coverPhoto} alt={projectName} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div className="reference-cover-glow" />
              <div className="bg-dots absolute inset-0 opacity-40" />
              <div className="text-muted-foreground/60 absolute inset-0 flex items-center justify-center">
                <Building2 className="h-16 w-16" />
              </div>
            </>
          )}
          <div className="reference-cover-shade" />
        </div>

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-muted-foreground inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {city}
              {area ? ` · ${area}` : ""}
              {state ? ` (${state})` : ""}
            </div>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{projectName}</h1>

            {/* Builder, Phone, Map & Timeline badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <StatusPill tone={statusTone(statusLabel)} dot>
                {statusLabel}
              </StatusPill>

              {builderName && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{builderName}</span>
                </div>
              )}

              {builderNumber && (
                <a
                  href={`tel:${builderNumber}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/50 transition-colors"
                >
                  <Phone className="h-3 w-3 text-primary" />
                  <span>{builderNumber}</span>
                </a>
              )}

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View on Google Maps</span>
                </a>
              )}

              {possessionDate && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Possession: {possessionDate}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Starting Price</div>
            <div className="text-primary mt-0.5 font-mono text-3xl font-bold tabular">{formatInr(basePriceValue)}</div>
          </div>
        </div>
      </RevealSection>

      {/* Onboarding Banner when no configurations exist yet */}
      {rawConfigs.length === 0 && (
        <RevealSection className="mt-6">
          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Next Step: Configure Floors and Flats for this Building
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                    This building is registered, but no floor or unit configurations have been added yet. Add your
                    first configuration to set up apartments (1 BHK, 2 BHK, etc.), commercial shops, or plots with
                    floor levels, pricing, and unit counts.
                  </p>
                </div>
              </div>

              <Button
                size="default"
                className="glow-primary shrink-0 gap-2 font-semibold"
                onClick={() => handleOpenAddConfig("1st Floor")}
              >
                <Plus className="h-4 w-4" />
                Add First Configuration
              </Button>
            </div>
          </div>
        </RevealSection>
      )}

      {/* KPI Inventory & Building Statistics Cards */}
      <RevealSection className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Total Configurations"
            value={String(rawConfigs.length)}
            subtitle={rawConfigs.length === 0 ? "Pending setup" : `${uniqueFloors.length} floor level(s)`}
          />
          <Stat
            label="Total Inventory"
            value={`${total} Units`}
            subtitle={`${available} available · ${sold} sold`}
          />
          <Stat
            label="Flats vs Commercial"
            value={`${residentialUnits} Res / ${commercialUnits} Comm`}
            subtitle={propertyCategory}
          />
          <Stat
            label="Absorption / Sales"
            value={`${Math.round(pct)}%`}
            subtitle={sold > 0 ? `${sold} units absorbed` : "No sales recorded"}
          />
        </div>

        {total > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Inventory Absorption</span>
              <span className="text-foreground">
                <strong>{sold}</strong> sold of <strong>{total}</strong> units ({Math.round(pct)}%)
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left bg-primary transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${Math.min(Math.max(pct, 0), 100) / 100})` }}
              />
            </div>
          </div>
        )}
      </RevealSection>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="bg-muted/40 border-border h-12 w-full justify-start gap-1 rounded-xl border p-1">
          <TabsTrigger value="details" className="gap-1.5 font-medium">
            <Layers className="h-4 w-4" /> Building Overview
          </TabsTrigger>
          <TabsTrigger value="configs" className="gap-1.5 font-medium">
            <Building2 className="h-4 w-4" /> Floors & Units ({rawConfigs.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 font-medium">
            <FileText className="h-4 w-4" /> Documents & Media ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="sell" className="gap-1.5 font-medium">
            <TrendingUp className="h-4 w-4" /> Unit Sales ({sales.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Building Overview */}
        <TabsContent value="details" className="mt-6">
          <PanelTransition motionKey="details">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SectionCard className="lg:col-span-2" eyebrow="Overview" title="Building & Project Specifications">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <DetailRow label="Project / Building Name" value={projectName} />
                  <DetailRow label="Developer / Builder" value={builderName || "Not specified"} />
                  <DetailRow label="Builder Contact Number" value={builderNumber || "Not specified"} />
                  <DetailRow label="Property Category" value={`${propertyCategory} · ${propertySubcategory || "Standard"}`} />
                  <DetailRow label="Project Status" value={statusLabel} />
                  <DetailRow label="Target Possession" value={possessionDate || "Under construction"} />
                  <DetailRow label="Base / Starting Price" value={formatInr(basePriceValue)} mono />
                  <DetailRow label="Total Units" value={`${total} Units`} mono />
                  <DetailRow label="Configured Floors" value={uniqueFloors.join(", ") || "No floors configured yet"} />
                  <DetailRow label="Building Address" value={address} />
                  <DetailRow label="Pincode / Postal Code" value={pincode} mono />
                </dl>

                {description && (
                  <div className="mt-6 border-t border-border/60 pt-4">
                    <dt className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Marketing Description</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{description}</dd>
                  </div>
                )}
              </SectionCard>

              <div className="flex flex-col gap-6">
                <SectionCard eyebrow="Leads & Interest" title="Inquiry Performance">
                  <div className="flex flex-col gap-3">
                    <Stat label="Total Inquiries" value={String(matchingLeads.length)} />
                    <Stat
                      label="Interested Buyers"
                      value={String(matchingLeads.filter((l) => l.status === "interested").length)}
                    />
                    <Stat
                      label="Lead Conversion"
                      value={`${matchingLeads.length > 0 ? Math.round((sold / matchingLeads.length) * 100) : 0}%`}
                    />
                  </div>
                </SectionCard>

                <SectionCard eyebrow="Audit" title="Record Details">
                  <div className="text-muted-foreground flex flex-col gap-2.5 text-xs">
                    <AuditRow label="Created Date" value={formatDate(project?.createdAt)} />
                    <AuditRow label="Last Modified" value={formatDate(project?.updatedAt)} />
                    <AuditRow label="Added By" value={owner} />
                    <AuditRow label="Last Editor" value={lastEditor} />
                  </div>
                </SectionCard>
              </div>
            </div>
          </PanelTransition>
        </TabsContent>

        {/* Tab 2: Floors & Units Configurations */}
        <TabsContent value="configs" className="mt-6">
          <PanelTransition motionKey="configs">
            <SectionCard
              eyebrow={`${rawConfigs.length} Configurations`}
              title="Building Floors & Unit Configurations"
              description="Manage apartment configurations, shop layouts, and inventory counts for each floor level."
              actions={
                <div className="flex items-center gap-2">
                  {uniqueFloors.length > 1 && (
                    <Select value={selectedFloorFilter} onValueChange={setSelectedFloorFilter}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="Filter Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Floors</SelectItem>
                        {uniqueFloors.map((fl) => (
                          <SelectItem key={fl} value={fl}>
                            {fl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    size="sm"
                    className="glow-primary gap-1.5"
                    onClick={() => handleOpenAddConfig()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Configuration
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                {filteredConfigs.length ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {filteredConfigs.map((config, index) => {
                      const actualIndex = rawConfigs.indexOf(config)
                      const configUnits = firstNumber(config, ["units", "totalUnits"], 1)
                      const configSold = firstNumber(config, ["unitsSold", "soldUnits"], 0)
                      const configAvail = Math.max(configUnits - configSold, 0)
                      const parking = firstBoolean(config, ["parkingAvailable", "parking"])
                      const parkingCostVal = firstNumber(config, ["parkingCost", "parkingPrice"], 0)
                      const floor = firstString(config, ["floorNo", "unitNo"], "Standard")
                      const label = configLabel(config)
                      const unitNums = firstString(config, ["unitNumbers", "unitLabels"], "")
                      const type = firstString(config, ["propertyType"], "Flat")
                      const priceVal = firstNumber(config, ["price", "basePrice", "amount"], 0)
                      const saleableVal = firstNumber(config, ["saleableAreaSqft", "saleableArea"], 0)
                      const rateVal = firstNumber(config, ["ratePerSqft"], saleableVal > 0 && priceVal > 0 ? Math.round(priceVal / saleableVal) : 0)

                      return (
                        <div
                          key={String(config.id ?? index)}
                          className="surface-elevated group rounded-xl border border-border/80 p-5 transition-all hover:border-primary/40 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                  {floor}
                                </span>
                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                  {type}
                                </span>
                                <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  {titleCase(firstString(config, ["listingType"], "Sell"))}
                                </span>
                              </div>

                              <h4 className="mt-2 text-base font-bold text-foreground">{label}</h4>

                              <div className="mt-1 text-xs text-muted-foreground">
                                {configArea(config)}
                                {rateVal > 0 ? ` · ₹${rateVal}/sq.ft` : ""}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-primary font-mono text-lg font-bold tabular">
                                {formatInr(priceVal)}
                              </div>
                              <div className="text-[11px] text-muted-foreground">Base Unit Price</div>
                            </div>
                          </div>

                          {/* Inventory Pill & Units numbers */}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{configUnits} Total Units:</span>
                              <span className="text-emerald-500 font-medium">{configAvail} Available</span>
                              {configSold > 0 && <span className="text-muted-foreground">· {configSold} Sold</span>}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {parking
                                ? `Parking Included${parkingCostVal > 0 ? ` (+₹${parkingCostVal})` : ""}`
                                : "No Dedicated Parking"}
                            </div>
                          </div>

                          {unitNums && (
                            <div className="mt-2 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1">
                              <strong>Units:</strong> {unitNums}
                            </div>
                          )}

                          {/* Actions: Edit, Duplicate, Delete */}
                          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 hover:text-primary"
                              onClick={() => handleDuplicateConfig(actualIndex)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Duplicate Floor
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleOpenEditConfig(actualIndex)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => setDeleteConfigIndex(actualIndex)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-10 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <div className="mt-3 text-sm font-semibold text-foreground">No Configurations Found</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Click "Add Configuration" above to configure your building floors and units.
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          </PanelTransition>
        </TabsContent>

        {/* Tab 3: Documents & Media */}
        <TabsContent value="documents" className="mt-6">
          <PanelTransition motionKey="documents">
            <ProjectDocumentsPanel projectId={String(projectId)} projectName={projectName} />
          </PanelTransition>
        </TabsContent>

        {/* Tab 4: Sell Units */}
        <TabsContent value="sell" className="mt-6">
          <PanelTransition motionKey="sell">
            <SectionCard
              eyebrow="Sales"
              title="Record a Unit Sale"
              description="Assign an available unit to a buyer and record revenue transaction."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat label="Available Units" value={String(available)} />
                <Stat label="Recorded Sales" value={String(sales.length)} />
                <Stat label="Base Unit Price" value={formatInr(basePriceValue)} mono />
              </div>

              <div className="mt-6">
                <Button
                  className="glow-primary gap-1.5"
                  onClick={() => setSellDialogOpen(true)}
                  disabled={available <= 0}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Open Unit Sale Form
                </Button>
                {available <= 0 && (
                  <p className="mt-2 text-xs text-destructive">All units in this building are currently marked sold.</p>
                )}
              </div>
            </SectionCard>
          </PanelTransition>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Configuration Modal Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfigIndex !== null ? "Edit Floor Configuration" : "Add Building Configuration"}
            </DialogTitle>
            <DialogDescription>
              Configure floor level, flat/shop type, unit counts, area dimensions, and pricing.
            </DialogDescription>
          </DialogHeader>

          {configFormError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {configFormError}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Property Type & Floor Level */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">Property Category</Label>
                <Select
                  value={configForm.propertyType}
                  onValueChange={(val) => {
                    const preset = val === "Flat" ? "2 BHK" : val === "Shop" ? "Shop" : "Plot"
                    setConfigForm((prev) => ({
                      ...prev,
                      propertyType: val,
                      configLabel: preset,
                    }))
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="floorNo" className="text-xs font-semibold">
                  Floor / Level
                </Label>
                <Input
                  id="floorNo"
                  placeholder="e.g. Ground Floor, 1st Floor, 2nd Floor"
                  value={configForm.floorNo}
                  onChange={(e) => {
                    const fl = e.target.value
                    setConfigForm((prev) => ({
                      ...prev,
                      floorNo: fl,
                      unitNumbers: generateUnitNumbers(fl, prev.units),
                    }))
                  }}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Configuration Label (Presets + Custom) */}
            <div>
              <Label htmlFor="configLabel" className="text-xs font-semibold">
                Configuration Type / Label <span className="text-destructive">*</span>
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="configLabel"
                  placeholder="e.g. 1 BHK, 2 BHK, 3 BHK, Shop 101, Penthouse"
                  value={configForm.configLabel}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, configLabel: e.target.value }))}
                  className="text-xs flex-1"
                />
              </div>

              {/* Quick Presets Pills */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(configForm.propertyType === "Shop"
                  ? COMMERCIAL_PRESETS
                  : configForm.propertyType === "Land"
                  ? LAND_PRESETS
                  : RESIDENTIAL_PRESETS
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setConfigForm((prev) => ({ ...prev, configLabel: preset }))}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      configForm.configLabel === preset
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Count & Unit Numbers */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="units" className="text-xs font-semibold">
                  Number of Units on this Floor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="units"
                  type="number"
                  min={1}
                  value={configForm.units}
                  onChange={(e) => {
                    const u = Math.max(1, parseInt(e.target.value, 10) || 1)
                    setConfigForm((prev) => ({
                      ...prev,
                      units: u,
                      unitNumbers: generateUnitNumbers(prev.floorNo, u),
                    }))
                  }}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="unitNumbers" className="text-xs font-semibold">
                    Unit Numbers
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfigForm((prev) => ({
                        ...prev,
                        unitNumbers: generateUnitNumbers(prev.floorNo, prev.units),
                      }))
                    }
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Auto-generate
                  </button>
                </div>
                <Input
                  id="unitNumbers"
                  placeholder="e.g. 101, 102, 103, 104"
                  value={configForm.unitNumbers}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, unitNumbers: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Area Details (Carpet & Saleable) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="carpetAreaSqft" className="text-xs font-semibold">
                  Carpet Area (Sq. Ft.)
                </Label>
                <Input
                  id="carpetAreaSqft"
                  type="number"
                  placeholder="e.g. 650"
                  value={configForm.carpetAreaSqft}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, carpetAreaSqft: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="saleableAreaSqft" className="text-xs font-semibold">
                  Saleable / Built-up Area (Sq. Ft.)
                </Label>
                <Input
                  id="saleableAreaSqft"
                  type="number"
                  placeholder="e.g. 850"
                  value={configForm.saleableAreaSqft}
                  onChange={(e) => {
                    const saleable = e.target.value
                    const sNum = Number(saleable) || 0
                    const pNum = Number(configForm.price) || 0
                    setConfigForm((prev) => ({
                      ...prev,
                      saleableAreaSqft: saleable,
                      ratePerSqft: sNum > 0 && pNum > 0 ? String(Math.round(pNum / sNum)) : prev.ratePerSqft,
                    }))
                  }}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Pricing Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="price" className="text-xs font-semibold">
                  Total Base Price (₹)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g. 4500000"
                  value={configForm.price}
                  onChange={(e) => {
                    const priceVal = e.target.value
                    const pNum = Number(priceVal) || 0
                    const sNum = Number(configForm.saleableAreaSqft) || 0
                    setConfigForm((prev) => ({
                      ...prev,
                      price: priceVal,
                      ratePerSqft: sNum > 0 && pNum > 0 ? String(Math.round(pNum / sNum)) : prev.ratePerSqft,
                    }))
                  }}
                  className="mt-1 text-xs"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {Number(configForm.price) > 0 ? formatInr(Number(configForm.price)) : "Price per unit"}
                </p>
              </div>

              <div>
                <Label htmlFor="ratePerSqft" className="text-xs font-semibold">
                  Rate per Sq. Ft. (₹)
                </Label>
                <Input
                  id="ratePerSqft"
                  type="number"
                  placeholder="e.g. 5294"
                  value={configForm.ratePerSqft}
                  onChange={(e) => {
                    const rateVal = e.target.value
                    const rNum = Number(rateVal) || 0
                    const sNum = Number(configForm.saleableAreaSqft) || 0
                    setConfigForm((prev) => ({
                      ...prev,
                      ratePerSqft: rateVal,
                      price: rNum > 0 && sNum > 0 ? String(Math.round(rNum * sNum)) : prev.price,
                    }))
                  }}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Parking & Listing Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">Dedicated Parking</Label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="parking"
                      checked={configForm.parkingAvailable}
                      onChange={() => setConfigForm((prev) => ({ ...prev, parkingAvailable: true }))}
                    />
                    Available
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="parking"
                      checked={!configForm.parkingAvailable}
                      onChange={() => setConfigForm((prev) => ({ ...prev, parkingAvailable: false }))}
                    />
                    Not Available
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Listing / Deal Type</Label>
                <Select
                  value={configForm.listingType}
                  onValueChange={(val: "Sell" | "Rent" | "Lease") =>
                    setConfigForm((prev) => ({ ...prev, listingType: val }))
                  }
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Listing Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sell">For Sale (Outright)</SelectItem>
                    <SelectItem value="Rent">For Rent</SelectItem>
                    <SelectItem value="Lease">Commercial Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfigDialogOpen(false)}
              disabled={isSavingConfig}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="glow-primary"
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
            >
              {isSavingConfig ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Configuration Confirmation Dialog */}
      <Dialog
        open={deleteConfigIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfigIndex(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Configuration?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {deleteConfigIndex !== null ? configLabel(rawConfigs[deleteConfigIndex]) : "this configuration"}
              </strong>
              ? Associated units and inventory on this floor will also be removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfigIndex(null)}
              disabled={isDeletingConfig}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteConfig}
              disabled={isDeletingConfig}
            >
              {isDeletingConfig ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Entire Project?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{projectName}</strong> along with all floors, units, and
              attached documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteProjectDialogOpen(false)}
              disabled={isDeletingProject}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Confirm & Delete Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Unit Dialog */}
      <SellUnitDialog
        open={sellDialogOpen}
        projectId={String(projectId)}
        initialProject={listProperty}
        leads={leads}
        onOpenChange={setSellDialogOpen}
        onSold={() => {
          void projectQuery.refetch()
        }}
      />
    </PageContainer>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold text-foreground ${mono ? "tabular font-mono" : ""}`}>{value}</dd>
    </div>
  )
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  )
}

function Stat({
  label,
  value,
  subtitle,
  mono = true,
}: {
  label: string
  value: string
  subtitle?: string
  mono?: boolean
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
      <div className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{label}</div>
      <div className={`mt-1 text-xl font-bold text-foreground sm:text-2xl ${mono ? "tabular font-mono" : ""}`}>
        {value}
      </div>
      {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
    </div>
  )
}
