"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Home,
  Layers,
  LayoutGrid,
  ListFilter,
  Loader2,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShoppingBag,
  Store,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { cn } from "@/lib/utils"

type RouteParams = {
  role: string
  propertyId: string
}

type DetailParams = RouteParams | Promise<RouteParams>

function isPromiseParams(params: DetailParams): params is Promise<RouteParams> {
  return typeof (params as Promise<RouteParams>).then === "function"
}

interface BuildingData {
  id: number
  projectId: number
  name: string
  buildingType: string
  totalFloors: number
  description?: string
  configuredFloors?: number
  totalUnits?: number
  floors?: FloorData[]
}

interface FloorData {
  id: number
  projectId: number
  buildingId: number
  buildingName?: string
  floorNumber: number
  floorName: string
  floorType: string
  totalUnits?: number
  units?: UnitData[]
}

interface UnitData {
  id: number
  propertyProjectId: number
  projectName?: string
  buildingId: number
  buildingName?: string
  floorId: number
  floorName?: string
  floorNumber?: number
  unitNumber: string
  unitType: string
  subType?: string
  carpetArea?: number
  carpetAreaUnit?: string
  builtUpArea?: number
  builtUpAreaUnit?: string
  superBuiltUpArea?: number
  bedrooms?: number
  bathrooms?: number
  balconies?: number
  parkingSpaces?: number
  facing?: string
  price?: number
  rentPrice?: number
  status: string
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  description?: string
  coverImageUrl?: string
  floorPlanUrl?: string
  documentCount?: number
}

interface UnitDocumentData {
  id: number
  propertyProjectId: number
  buildingId: number
  floorId: number
  unitId: number
  documentName: string
  documentType: string
  filePath: string
  fileUrl?: string
  fileSize?: number
  contentType?: string
  uploadedBy?: number
  description?: string
  version?: number
  createdAt?: string
}

interface HierarchyData {
  propertyId: number
  propertyName: string
  propertyCode?: string
  propertyType?: string
  city?: string
  area?: string
  status?: string
  totalBuildings: number
  totalFloors: number
  totalResidentialUnits: number
  totalCommercialUnits: number
  availableUnits: number
  reservedUnits: number
  soldUnits: number
  rentedUnits: number
  totalUnits: number
  buildings: BuildingData[]
}

const DOCUMENT_CATEGORIES = [
  { value: "FLAT_AGREEMENT", label: "Flat Agreement" },
  { value: "SALE_DEED", label: "Sale Deed" },
  { value: "OWNERSHIP_DOCS", label: "Ownership Documents" },
  { value: "ALLOTMENT_LETTER", label: "Allotment Letter" },
  { value: "FLOOR_PLAN", label: "Floor Plan" },
  { value: "PROPERTY_TAX", label: "Property Tax Documents" },
  { value: "MAINTENANCE", label: "Maintenance Documents" },
  { value: "PAYMENT_RECEIPTS", label: "Payment Receipts" },
  { value: "NOC", label: "NOC (No Objection Certificate)" },
  { value: "OTHER", label: "Other Document" },
]

export default function PropertyConfigurationsPage({ params }: { params: DetailParams }) {
  const resolved = isPromiseParams(params) ? use(params) : params
  return <PropertyConfigurationsContent role={resolved.role} propertyId={resolved.propertyId} />
}

function PropertyConfigurationsContent({ role, propertyId }: { role: string; propertyId: string }) {
  const queryClient = useQueryClient()
  const auth = useAuth()

  const [activeTab, setActiveTab] = useState<"structure" | "inventory">("structure")
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null)
  const [expandedFloorIds, setExpandedFloorIds] = useState<Record<number, boolean>>({})

  // Modals state
  const [buildingModalOpen, setBuildingModalOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<BuildingData | null>(null)
  const [buildingForm, setBuildingForm] = useState({ name: "", buildingType: "RESIDENTIAL", totalFloors: "1", description: "" })

  const [floorModalOpen, setFloorModalOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState<FloorData | null>(null)
  const [floorForm, setFloorForm] = useState({ buildingId: 0, floorNumber: "0", floorName: "Ground Floor", floorType: "MIXED" })

  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitData | null>(null)
  const [unitCategory, setUnitCategory] = useState<"FLAT" | "SHOP" | "OFFICE" | "OTHER">("FLAT")
  const [unitForm, setUnitForm] = useState({
    buildingId: 0,
    floorId: 0,
    unitNumber: "",
    unitType: "FLAT",
    subType: "2 BHK",
    carpetArea: "",
    carpetAreaUnit: "sq_ft",
    builtUpArea: "",
    builtUpAreaUnit: "sq_ft",
    superBuiltUpArea: "",
    bedrooms: "2",
    bathrooms: "2",
    balconies: "1",
    parkingSpaces: "1",
    facing: "East",
    price: "",
    rentPrice: "",
    status: "AVAILABLE",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    description: "",
  })

  // Unit Documents Modal
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [activeUnitForDocs, setActiveUnitForDocs] = useState<UnitData | null>(null)
  const [docUploadForm, setDocUploadForm] = useState({ documentName: "", documentType: "FLAT_AGREEMENT", description: "" })
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null)
  const [docUploading, setDocUploading] = useState(false)
  const [docUploadError, setDocUploadError] = useState("")

  // Inventory Filters
  const [inventorySearch, setInventorySearch] = useState("")
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState("all")
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState("all")
  const [inventoryBuildingFilter, setInventoryBuildingFilter] = useState("all")

  // Operation messages
  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch Hierarchy
  const hierarchyQuery = useQuery({
    queryKey: ["v0", "property-hierarchy", propertyId],
    queryFn: async () => {
      const res = await estateApi.properties.hierarchy(propertyId)
      return res as HierarchyData
    },
    enabled: auth.ready && Boolean(auth.token) && Boolean(propertyId),
  })

  // Fetch Unit Documents for active modal
  const unitDocsQuery = useQuery({
    queryKey: ["v0", "unit-docs", propertyId, activeUnitForDocs?.id],
    queryFn: async () => {
      if (!activeUnitForDocs?.id) return []
      const res = await estateApi.properties.unitDocuments(propertyId, activeUnitForDocs.id)
      return (Array.isArray(res) ? res : []) as UnitDocumentData[]
    },
    enabled: Boolean(documentModalOpen && activeUnitForDocs?.id),
  })

  const hierarchy = hierarchyQuery.data
  const buildings = hierarchy?.buildings || []

  // Default select first building
  useEffect(() => {
    if (buildings.length > 0 && selectedBuildingId === null) {
      setSelectedBuildingId(buildings[0].id)
      // Expand all floors of first building by default
      if (buildings[0].floors) {
        const expanded: Record<number, boolean> = {}
        buildings[0].floors.forEach((f) => {
          expanded[f.id] = true
        })
        setExpandedFloorIds(expanded)
      }
    }
  }, [buildings, selectedBuildingId])

  const currentBuilding = useMemo(() => {
    return buildings.find((b) => b.id === selectedBuildingId) || buildings[0] || null
  }, [buildings, selectedBuildingId])

  // Flatten all units for Inventory Tab
  const allUnits = useMemo(() => {
    const list: UnitData[] = []
    buildings.forEach((b) => {
      (b.floors || []).forEach((f) => {
        (f.units || []).forEach((u) => {
          list.push({ ...u, buildingName: b.name, floorName: f.floorName, floorNumber: f.floorNumber })
        })
      })
    })
    return list
  }, [buildings])

  const filteredInventory = useMemo(() => {
    return allUnits.filter((u) => {
      if (inventoryTypeFilter !== "all" && u.unitType.toLowerCase() !== inventoryTypeFilter.toLowerCase()) return false
      if (inventoryStatusFilter !== "all" && u.status.toLowerCase() !== inventoryStatusFilter.toLowerCase()) return false
      if (inventoryBuildingFilter !== "all" && String(u.buildingId) !== inventoryBuildingFilter) return false
      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase()
        const matchesNo = u.unitNumber.toLowerCase().includes(q)
        const matchesOwner = (u.ownerName || "").toLowerCase().includes(q)
        const matchesSubtype = (u.subType || "").toLowerCase().includes(q)
        if (!matchesNo && !matchesOwner && !matchesSubtype) return false
      }
      return true
    })
  }, [allUnits, inventoryBuildingFilter, inventorySearch, inventoryStatusFilter, inventoryTypeFilter])

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Handle Building Create / Edit
  const handleSaveBuilding = async () => {
    if (!buildingForm.name.trim()) {
      setErrorMessage("Building name is required")
      return
    }
    setActionLoading(true)
    setErrorMessage(null)
    try {
      if (editingBuilding) {
        await estateApi.properties.updateBuilding(propertyId, editingBuilding.id, {
          name: buildingForm.name.trim(),
          buildingType: buildingForm.buildingType,
          totalFloors: Number(buildingForm.totalFloors) || 1,
          description: buildingForm.description,
        })
        notifySuccess("Building updated successfully!")
      } else {
        const res = (await estateApi.properties.createBuilding(propertyId, {
          name: buildingForm.name.trim(),
          buildingType: buildingForm.buildingType,
          totalFloors: Number(buildingForm.totalFloors) || 1,
          description: buildingForm.description,
        })) as BuildingData
        notifySuccess("Building & floors configured successfully!")
        if (res?.id) setSelectedBuildingId(res.id)
      }
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
      setBuildingModalOpen(false)
      setEditingBuilding(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save building")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteBuilding = async (bId: number, bName: string) => {
    if (!confirm(`Are you sure you want to delete "${bName}" and all its configured floors, units, and documents?`)) return
    setActionLoading(true)
    try {
      await estateApi.properties.deleteBuilding(propertyId, bId)
      notifySuccess(`Building "${bName}" deleted successfully!`)
      setSelectedBuildingId(null)
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete building")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Floor Create / Edit
  const handleSaveFloor = async () => {
    if (!floorForm.floorName.trim()) {
      setErrorMessage("Floor name is required")
      return
    }
    const targetBuildingId = floorForm.buildingId || currentBuilding?.id
    if (!targetBuildingId) {
      setErrorMessage("Please select a building")
      return
    }
    setActionLoading(true)
    setErrorMessage(null)
    try {
      if (editingFloor) {
        await estateApi.properties.updateFloor(propertyId, targetBuildingId, editingFloor.id, {
          floorNumber: Number(floorForm.floorNumber),
          floorName: floorForm.floorName.trim(),
          floorType: floorForm.floorType,
        })
        notifySuccess("Floor updated successfully!")
      } else {
        await estateApi.properties.createFloor(propertyId, targetBuildingId, {
          floorNumber: Number(floorForm.floorNumber),
          floorName: floorForm.floorName.trim(),
          floorType: floorForm.floorType,
        })
        notifySuccess("Floor added successfully!")
      }
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
      setFloorModalOpen(false)
      setEditingFloor(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save floor")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteFloor = async (fId: number, fName: string) => {
    if (!currentBuilding) return
    if (!confirm(`Are you sure you want to delete "${fName}" and its units?`)) return
    setActionLoading(true)
    try {
      await estateApi.properties.deleteFloor(propertyId, currentBuilding.id, fId)
      notifySuccess(`Floor "${fName}" deleted successfully!`)
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete floor")
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Unit Create / Edit
  const handleOpenAddUnit = (bId?: number, fId?: number) => {
    const targetBId = bId || currentBuilding?.id || 0
    const targetFId = fId || currentBuilding?.floors?.[0]?.id || 0
    setEditingUnit(null)
    setUnitCategory("FLAT")
    setUnitForm({
      buildingId: targetBId,
      floorId: targetFId,
      unitNumber: "",
      unitType: "FLAT",
      subType: "2 BHK",
      carpetArea: "",
      carpetAreaUnit: "sq_ft",
      builtUpArea: "",
      builtUpAreaUnit: "sq_ft",
      superBuiltUpArea: "",
      bedrooms: "2",
      bathrooms: "2",
      balconies: "1",
      parkingSpaces: "1",
      facing: "East",
      price: "",
      rentPrice: "",
      status: "AVAILABLE",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      description: "",
    })
    setUnitModalOpen(true)
  }

  const handleOpenEditUnit = (unit: UnitData) => {
    setEditingUnit(unit)
    const cat = unit.unitType === "SHOP" ? "SHOP" : unit.unitType === "OFFICE" ? "OFFICE" : unit.unitType === "FLAT" ? "FLAT" : "OTHER"
    setUnitCategory(cat)
    setUnitForm({
      buildingId: unit.buildingId,
      floorId: unit.floorId,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      subType: unit.subType || "",
      carpetArea: unit.carpetArea ? String(unit.carpetArea) : "",
      carpetAreaUnit: unit.carpetAreaUnit || "sq_ft",
      builtUpArea: unit.builtUpArea ? String(unit.builtUpArea) : "",
      builtUpAreaUnit: unit.builtUpAreaUnit || "sq_ft",
      superBuiltUpArea: unit.superBuiltUpArea ? String(unit.superBuiltUpArea) : "",
      bedrooms: unit.bedrooms !== undefined ? String(unit.bedrooms) : "2",
      bathrooms: unit.bathrooms !== undefined ? String(unit.bathrooms) : "2",
      balconies: unit.balconies !== undefined ? String(unit.balconies) : "1",
      parkingSpaces: unit.parkingSpaces !== undefined ? String(unit.parkingSpaces) : "1",
      facing: unit.facing || "East",
      price: unit.price ? String(unit.price) : "",
      rentPrice: unit.rentPrice ? String(unit.rentPrice) : "",
      status: unit.status || "AVAILABLE",
      ownerName: unit.ownerName || "",
      ownerPhone: unit.ownerPhone || "",
      ownerEmail: unit.ownerEmail || "",
      description: unit.description || "",
    })
    setUnitModalOpen(true)
  }

  const handleSaveUnit = async () => {
    if (!unitForm.unitNumber.trim()) {
      setErrorMessage("Unit Number is required (e.g. 101, Shop 01)")
      return
    }
    if (!unitForm.floorId) {
      setErrorMessage("Please select a floor")
      return
    }
    setActionLoading(true)
    setErrorMessage(null)
    try {
      const payload = {
        buildingId: unitForm.buildingId,
        floorId: unitForm.floorId,
        unitNumber: unitForm.unitNumber.trim(),
        unitType: unitCategory,
        subType: unitForm.subType.trim(),
        carpetArea: unitForm.carpetArea ? Number(unitForm.carpetArea) : undefined,
        carpetAreaUnit: unitForm.carpetAreaUnit,
        builtUpArea: unitForm.builtUpArea ? Number(unitForm.builtUpArea) : undefined,
        builtUpAreaUnit: unitForm.builtUpAreaUnit,
        superBuiltUpArea: unitForm.superBuiltUpArea ? Number(unitForm.superBuiltUpArea) : undefined,
        bedrooms: unitCategory === "FLAT" ? Number(unitForm.bedrooms) : undefined,
        bathrooms: unitCategory === "FLAT" ? Number(unitForm.bathrooms) : undefined,
        balconies: unitCategory === "FLAT" ? Number(unitForm.balconies) : undefined,
        parkingSpaces: Number(unitForm.parkingSpaces) || 0,
        facing: unitForm.facing,
        price: unitForm.price ? Number(unitForm.price) : undefined,
        rentPrice: unitForm.rentPrice ? Number(unitForm.rentPrice) : undefined,
        status: unitForm.status,
        ownerName: unitForm.ownerName.trim() || undefined,
        ownerPhone: unitForm.ownerPhone.trim() || undefined,
        ownerEmail: unitForm.ownerEmail.trim() || undefined,
        description: unitForm.description.trim() || undefined,
      }

      if (editingUnit) {
        await estateApi.properties.updateUnit(propertyId, editingUnit.id, payload)
        notifySuccess(`Unit "${unitForm.unitNumber}" updated successfully!`)
      } else {
        await estateApi.properties.createUnit(propertyId, unitForm.buildingId, unitForm.floorId, payload)
        notifySuccess(`Unit "${unitForm.unitNumber}" added successfully!`)
      }
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
      setUnitModalOpen(false)
      setEditingUnit(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save unit")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUnit = async (uId: number, uNo: string) => {
    if (!confirm(`Are you sure you want to delete unit "${uNo}" and all its documents?`)) return
    setActionLoading(true)
    try {
      await estateApi.properties.deleteUnit(propertyId, uId)
      notifySuccess(`Unit "${uNo}" deleted successfully!`)
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete unit")
    } finally {
      setActionLoading(false)
    }
  }

  // Open Document Manager for specific Unit
  const handleOpenDocManager = (unit: UnitData) => {
    setActiveUnitForDocs(unit)
    setDocUploadForm({ documentName: "", documentType: "FLAT_AGREEMENT", description: "" })
    setDocUploadFile(null)
    setDocUploadError("")
    setDocumentModalOpen(true)
  }

  const handleUploadUnitDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnitForDocs || !docUploadFile) {
      setDocUploadError("Please select a file to upload")
      return
    }
    setDocUploading(true)
    setDocUploadError("")
    try {
      const formData = new FormData()
      formData.append("file", docUploadFile)
      formData.append("documentName", docUploadForm.documentName.trim() || docUploadFile.name)
      formData.append("documentType", docUploadForm.documentType)
      if (docUploadForm.description) formData.append("description", docUploadForm.description.trim())

      await estateApi.properties.uploadUnitDocument(propertyId, activeUnitForDocs.id, formData)
      notifySuccess(`Document uploaded for unit ${activeUnitForDocs.unitNumber}!`)
      setDocUploadFile(null)
      setDocUploadForm({ documentName: "", documentType: "FLAT_AGREEMENT", description: "" })
      await queryClient.invalidateQueries({ queryKey: ["v0", "unit-docs", propertyId, activeUnitForDocs.id] })
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
    } catch (err) {
      setDocUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setDocUploading(false)
    }
  }

  const handleDeleteUnitDoc = async (docId: number, docName: string) => {
    if (!activeUnitForDocs || !confirm(`Delete "${docName}"?`)) return
    try {
      await estateApi.properties.deleteUnitDocument(propertyId, activeUnitForDocs.id, docId)
      notifySuccess(`Document "${docName}" deleted!`)
      await queryClient.invalidateQueries({ queryKey: ["v0", "unit-docs", propertyId, activeUnitForDocs.id] })
      await queryClient.invalidateQueries({ queryKey: ["v0", "property-hierarchy", propertyId] })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document")
    }
  }

  const toggleFloor = (fId: number) => {
    setExpandedFloorIds((prev) => ({ ...prev, [fId]: !prev[fId] }))
  }

  if (hierarchyQuery.isLoading) {
    return (
      <PageContainer className="py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading property structure & inventory...</p>
      </PageContainer>
    )
  }

  if (!hierarchy) {
    return (
      <PageContainer className="py-12 text-center">
        <p className="text-destructive font-semibold">Property not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={`/${role}/properties`}>Back to properties</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="max-w-[1720px] py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href={`/${role}/properties`} className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Properties
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{hierarchy.propertyName}</span>
            {hierarchy.propertyCode && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                {hierarchy.propertyCode}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-3">
            <Building2 className="h-7 w-7 text-primary" />
            {hierarchy.propertyName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
            <span>{hierarchy.propertyType || "Residential & Commercial Complex"}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {hierarchy.city ? `${hierarchy.city}${hierarchy.area ? ` → ${hierarchy.area}` : ""}` : "Location configured"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingBuilding(null)
              setBuildingForm({ name: `Tower ${String.fromCharCode(65 + buildings.length)}`, buildingType: "RESIDENTIAL", totalFloors: "5", description: "" })
              setBuildingModalOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            Add Building / Tower
          </Button>
          <Button
            size="sm"
            className="glow-primary gap-1.5"
            onClick={() => handleOpenAddUnit()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Flat / Unit
          </Button>
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link href={`/${role}/properties/${propertyId}/edit`}>
              <Edit className="h-3.5 w-3.5" />
              Edit Property
            </Link>
          </Button>
        </div>
      </div>

      {/* Success & Error alerts */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive flex items-center gap-2.5">
          <X className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setErrorMessage(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Real-time Database Dashboard Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        <div className="surface-elevated rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Buildings
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">{hierarchy.totalBuildings}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Configured towers</div>
        </div>

        <div className="surface-elevated rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            Floors
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">{hierarchy.totalFloors}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Total stories</div>
        </div>

        <div className="surface-elevated rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5 text-amber-400" />
            Flats (Res.)
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">{hierarchy.totalResidentialUnits}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Residential units</div>
        </div>

        <div className="surface-elevated rounded-xl border border-border/80 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-purple-400" />
            Shops (Comm.)
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">{hierarchy.totalCommercialUnits}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Retail & offices</div>
        </div>

        <div className="surface-elevated rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Available</div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">{hierarchy.availableUnits}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Ready for sale</div>
        </div>

        <div className="surface-elevated rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Reserved</div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">{hierarchy.reservedUnits}</div>
          <div className="text-[10px] text-amber-400/80 mt-1">Token paid</div>
        </div>

        <div className="surface-elevated rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Sold</div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-400">{hierarchy.soldUnits}</div>
          <div className="text-[10px] text-rose-400/80 mt-1">Agreements executed</div>
        </div>

        <div className="surface-elevated rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Rented</div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-400">{hierarchy.rentedUnits}</div>
          <div className="text-[10px] text-blue-400/80 mt-1">Leased spaces</div>
        </div>

        <div className="surface-elevated rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Total Units</div>
          <div className="mt-2 text-2xl font-bold font-mono text-primary">{hierarchy.totalUnits}</div>
          <div className="text-[10px] text-primary/80 mt-1">Complete capacity</div>
        </div>
      </div>

      {/* Tab Switcher: Structure vs Inventory */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === "structure" ? "default" : "ghost"}
          size="sm"
          className="gap-2"
          onClick={() => setActiveTab("structure")}
        >
          <Layers className="h-4 w-4" />
          Building & Floor Hierarchy
        </Button>
        <Button
          variant={activeTab === "inventory" ? "default" : "ghost"}
          size="sm"
          className="gap-2"
          onClick={() => setActiveTab("inventory")}
        >
          <LayoutGrid className="h-4 w-4" />
          All Units Inventory ({allUnits.length})
        </Button>
      </div>

      {/* TAB 1: STRUCTURE & HIERARCHY */}
      {activeTab === "structure" && (
        <div className="space-y-6">
          {/* Towers / Buildings Selector Tabs */}
          {buildings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-muted/10">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-bold text-foreground">No Buildings Configured Yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Get started by adding your first building or tower (e.g. Tower A, Commercial Wing, or Building 1).
              </p>
              <Button
                size="sm"
                className="glow-primary mt-5 gap-2"
                onClick={() => {
                  setEditingBuilding(null)
                  setBuildingForm({ name: "Tower A", buildingType: "RESIDENTIAL", totalFloors: "5", description: "" })
                  setBuildingModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Add First Building
              </Button>
            </div>
          ) : (
            <>
              {/* Buildings Tab Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {buildings.map((b) => {
                  const isSelected = currentBuilding?.id === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBuildingId(b.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40"
                          : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      <span>{b.name}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono">
                        {b.configuredFloors ?? b.floors?.length ?? 0} Floors
                      </span>
                    </button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-dashed gap-1 text-xs"
                  onClick={() => {
                    setEditingBuilding(null)
                    setBuildingForm({ name: `Tower ${String.fromCharCode(65 + buildings.length)}`, buildingType: "RESIDENTIAL", totalFloors: "5", description: "" })
                    setBuildingModalOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Tower
                </Button>
              </div>

              {/* Selected Building Details & Floor Stack */}
              {currentBuilding && (
                <div className="rounded-2xl border border-border/80 bg-muted/10 p-5 space-y-6">
                  {/* Building header info */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-foreground">{currentBuilding.name}</h2>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                          {currentBuilding.buildingType}
                        </span>
                      </div>
                      {currentBuilding.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{currentBuilding.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => {
                          setEditingFloor(null)
                          const nextNum = (currentBuilding.floors?.length || 0)
                          setFloorForm({
                            buildingId: currentBuilding.id,
                            floorNumber: String(nextNum),
                            floorName: nextNum === 0 ? "Ground Floor" : `Floor ${nextNum}`,
                            floorType: "MIXED",
                          })
                          setFloorModalOpen(true)
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        Add Floor
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setEditingBuilding(currentBuilding)
                          setBuildingForm({
                            name: currentBuilding.name,
                            buildingType: currentBuilding.buildingType,
                            totalFloors: String(currentBuilding.totalFloors),
                            description: currentBuilding.description || "",
                          })
                          setBuildingModalOpen(true)
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteBuilding(currentBuilding.id, currentBuilding.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Floors Stack */}
                  <div className="space-y-4">
                    {(!currentBuilding.floors || currentBuilding.floors.length === 0) ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center bg-background/50">
                        <Layers className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-semibold">No floors configured in {currentBuilding.name}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 gap-1.5"
                          onClick={() => {
                            setEditingFloor(null)
                            setFloorForm({ buildingId: currentBuilding.id, floorNumber: "0", floorName: "Ground Floor", floorType: "MIXED" })
                            setFloorModalOpen(true)
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Ground Floor
                        </Button>
                      </div>
                    ) : (
                      currentBuilding.floors.map((floor) => {
                        const isExpanded = expandedFloorIds[floor.id] !== false
                        const units = floor.units || []

                        return (
                          <div
                            key={floor.id}
                            className="rounded-xl border border-border/80 bg-background/70 overflow-hidden shadow-sm transition-all"
                          >
                            {/* Floor Header Bar */}
                            <div
                              className="flex items-center justify-between p-3.5 bg-muted/30 cursor-pointer hover:bg-muted/50 select-none border-b border-border/50"
                              onClick={() => toggleFloor(floor.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                                  {floor.floorNumber}
                                </span>
                                <div>
                                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                    {floor.floorName}
                                    <span className="text-[10px] font-normal text-muted-foreground rounded bg-muted px-1.5 py-0.5">
                                      {floor.floorType}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {units.length} unit{units.length === 1 ? "" : "s"} configured
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                                  onClick={() => handleOpenAddUnit(currentBuilding.id, floor.id)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Unit
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingFloor(floor)
                                    setFloorForm({
                                      buildingId: currentBuilding.id,
                                      floorNumber: String(floor.floorNumber),
                                      floorName: floor.floorName,
                                      floorType: floor.floorType,
                                    })
                                    setFloorModalOpen(true)
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteFloor(floor.id, floor.floorName)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <ChevronDown
                                  className={cn("h-4 w-4 text-muted-foreground transition-transform ml-1", isExpanded && "rotate-180")}
                                />
                              </div>
                            </div>

                            {/* Units Container on this Floor */}
                            {isExpanded && (
                              <div className="p-4 bg-background/40">
                                {units.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-muted-foreground">
                                    No units added on {floor.floorName} yet.
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-primary text-xs ml-1 p-0 h-auto"
                                      onClick={() => handleOpenAddUnit(currentBuilding.id, floor.id)}
                                    >
                                      + Add first flat or shop
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {units.map((unit) => {
                                      const isShop = unit.unitType === "SHOP" || unit.unitType === "COMMERCIAL"
                                      const isOffice = unit.unitType === "OFFICE"
                                      const statusClass =
                                        unit.status === "AVAILABLE"
                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                          : unit.status === "RESERVED"
                                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                          : unit.status === "SOLD"
                                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                          : unit.status === "RENTED"
                                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                          : "bg-slate-500/10 text-slate-400 border-slate-500/30"

                                      return (
                                        <div
                                          key={unit.id}
                                          className="group rounded-xl border border-border/80 bg-muted/20 p-3.5 hover:border-primary/40 hover:bg-muted/30 transition-all flex flex-col justify-between"
                                        >
                                          <div>
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className={cn(
                                                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                                                    isShop
                                                      ? "bg-purple-500/10 text-purple-400"
                                                      : isOffice
                                                      ? "bg-sky-500/10 text-sky-400"
                                                      : "bg-amber-500/10 text-amber-400"
                                                  )}
                                                >
                                                  {isShop ? <Store className="h-4 w-4" /> : isOffice ? <ShoppingBag className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                  <div className="font-bold text-sm text-foreground">
                                                    {unit.unitNumber}
                                                  </div>
                                                  <div className="text-[11px] font-medium text-muted-foreground">
                                                    {unit.subType || unit.unitType}
                                                  </div>
                                                </div>
                                              </div>
                                              <span
                                                className={cn(
                                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                                  statusClass
                                                )}
                                              >
                                                {unit.status}
                                              </span>
                                            </div>

                                            {/* Specs */}
                                            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
                                              {unit.carpetArea ? (
                                                <div>
                                                  Carpet: <span className="text-foreground font-medium">{unit.carpetArea} {unit.carpetAreaUnit || "sq ft"}</span>
                                                </div>
                                              ) : null}
                                              {unit.builtUpArea ? (
                                                <div>
                                                  Built-up: <span className="text-foreground font-medium">{unit.builtUpArea} {unit.builtUpAreaUnit || "sq ft"}</span>
                                                </div>
                                              ) : null}
                                              {unit.facing ? (
                                                <div>
                                                  Facing: <span className="text-foreground font-medium">{unit.facing}</span>
                                                </div>
                                              ) : null}
                                              {unit.bedrooms ? (
                                                <div>
                                                  Beds: <span className="text-foreground font-medium">{unit.bedrooms} BHK</span>
                                                </div>
                                              ) : null}
                                            </div>

                                            {/* Pricing & Owner */}
                                            {(unit.price || unit.rentPrice) && (
                                              <div className="mt-2 text-xs font-semibold text-primary">
                                                {unit.price ? `₹${unit.price.toLocaleString("en-IN")}` : ""}
                                                {unit.rentPrice ? ` · ₹${unit.rentPrice.toLocaleString("en-IN")}/mo` : ""}
                                              </div>
                                            )}

                                            {unit.ownerName && (
                                              <div className="mt-1 text-[11px] text-muted-foreground truncate">
                                                Owner: <span className="text-foreground">{unit.ownerName}</span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Action footer */}
                                          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="h-7 text-xs gap-1.5 px-2.5 bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                                              onClick={() => handleOpenDocManager(unit)}
                                            >
                                              <FileText className="h-3.5 w-3.5" />
                                              Docs
                                              <span className="rounded-full bg-background/80 px-1.5 py-0.2 text-[10px] font-mono">
                                                {unit.documentCount ?? 0}
                                              </span>
                                            </Button>

                                            <div className="flex items-center gap-1">
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => handleOpenEditUnit(unit)}
                                              >
                                                <Edit className="h-3 w-3 text-muted-foreground" />
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteUnit(unit.id, unit.unitNumber)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: ALL UNITS INVENTORY SEARCH & TABLE */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-border/80 bg-muted/10 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search unit #, owner, sub-type..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <Select value={inventoryBuildingFilter} onValueChange={setInventoryBuildingFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={inventoryTypeFilter} onValueChange={setInventoryTypeFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Unit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Unit Types</SelectItem>
                  <SelectItem value="FLAT">Residential Flat</SelectItem>
                  <SelectItem value="SHOP">Commercial Shop</SelectItem>
                  <SelectItem value="OFFICE">Office</SelectItem>
                  <SelectItem value="OTHER">Other Space</SelectItem>
                </SelectContent>
              </Select>

              <Select value={inventoryStatusFilter} onValueChange={setInventoryStatusFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="RENTED">Rented</SelectItem>
                  <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              Showing {filteredInventory.length} of {allUnits.length} total units
            </div>
          </div>

          {/* Units Inventory Table */}
          <div className="rounded-2xl border border-border/80 bg-background overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Unit #</th>
                    <th className="py-3 px-4">Building & Floor</th>
                    <th className="py-3 px-4">Type / Config</th>
                    <th className="py-3 px-4">Carpet / Built-up</th>
                    <th className="py-3 px-4">Price / Rent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Owner / Tenant</th>
                    <th className="py-3 px-4 text-center">Docs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground text-xs">
                        No units match these filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((unit) => {
                      const statusClass =
                        unit.status === "AVAILABLE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : unit.status === "RESERVED"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : unit.status === "SOLD"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : unit.status === "RENTED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/30"

                      return (
                        <tr key={unit.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">{unit.unitNumber}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {unit.buildingName} · {unit.floorName || `Floor ${unit.floorNumber}`}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-foreground">{unit.subType || unit.unitType}</span>
                            <span className="ml-1.5 text-[10px] text-muted-foreground">({unit.unitType})</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {unit.carpetArea ? `${unit.carpetArea} ${unit.carpetAreaUnit || "sq ft"}` : "—"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-primary">
                            {unit.price ? `₹${unit.price.toLocaleString("en-IN")}` : unit.rentPrice ? `₹${unit.rentPrice.toLocaleString("en-IN")}/mo` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusClass)}>
                              {unit.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {unit.ownerName ? (
                              <div>
                                <div className="text-foreground font-medium">{unit.ownerName}</div>
                                {unit.ownerPhone && <div className="text-[10px]">{unit.ownerPhone}</div>}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleOpenDocManager(unit)}
                            >
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              <span className="font-mono text-[11px]">{unit.documentCount ?? 0}</span>
                            </Button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleOpenEditUnit(unit)}
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteUnit(unit.id, unit.unitNumber)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD / EDIT BUILDING */}
      {/* ==================================================== */}
      <Dialog open={buildingModalOpen} onOpenChange={setBuildingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBuilding ? "Edit Building / Tower" : "Add Building or Tower"}</DialogTitle>
            <DialogDescription>
              Configure the tower name, property category, and total floor capacity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="bName" className="text-xs font-semibold">
                Building / Tower Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bName"
                placeholder="e.g. Tower A, Wing 1, Commercial Complex"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bType" className="text-xs font-semibold">Building Type</Label>
                <Select
                  value={buildingForm.buildingType}
                  onValueChange={(val) => setBuildingForm({ ...buildingForm, buildingType: val })}
                >
                  <SelectTrigger id="bType" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    <SelectItem value="MIXED_USE">Mixed-Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bFloors" className="text-xs font-semibold">
                  Total Floors <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bFloors"
                  type="number"
                  min="1"
                  max="120"
                  value={buildingForm.totalFloors}
                  onChange={(e) => setBuildingForm({ ...buildingForm, totalFloors: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bDesc" className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                id="bDesc"
                rows={2}
                placeholder="Notes on tower orientation, elevator count, occupancy..."
                value={buildingForm.description}
                onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBuildingModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="glow-primary" onClick={handleSaveBuilding} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBuilding ? "Save Changes" : "Create Building"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 2: ADD / EDIT FLOOR */}
      {/* ==================================================== */}
      <Dialog open={floorModalOpen} onOpenChange={setFloorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFloor ? "Edit Floor" : "Add Floor to Building"}</DialogTitle>
            <DialogDescription>
              Configure floor number, display name (e.g. Ground Floor, 1st Floor), and space usage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="fBuilding" className="text-xs font-semibold">Building / Tower</Label>
              <Select
                value={String(floorForm.buildingId || currentBuilding?.id)}
                onValueChange={(val) => setFloorForm({ ...floorForm, buildingId: Number(val) })}
                disabled={Boolean(editingFloor)}
              >
                <SelectTrigger id="fBuilding" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fNum" className="text-xs font-semibold">
                  Floor Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fNum"
                  type="number"
                  placeholder="0, 1, 2, -1"
                  value={floorForm.floorNumber}
                  onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="fType" className="text-xs font-semibold">Floor Type</Label>
                <Select
                  value={floorForm.floorType}
                  onValueChange={(val) => setFloorForm({ ...floorForm, floorType: val })}
                >
                  <SelectTrigger id="fType" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                    <SelectItem value="COMMERCIAL">Commercial / Retail</SelectItem>
                    <SelectItem value="MIXED">Mixed (Flats & Shops)</SelectItem>
                    <SelectItem value="PARKING">Parking / Basement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="fName" className="text-xs font-semibold">
                Floor Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fName"
                placeholder="e.g. Ground Floor, 1st Floor, Basement 1"
                value={floorForm.floorName}
                onChange={(e) => setFloorForm({ ...floorForm, floorName: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFloorModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="glow-primary" onClick={handleSaveFloor} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingFloor ? "Save Changes" : "Add Floor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 3: ADD / EDIT UNIT (FLAT, SHOP, OFFICE, ETC.) */}
      {/* ==================================================== */}
      <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? `Edit Unit: ${editingUnit.unitNumber}` : "Add Unit (Flat, Shop or Office)"}</DialogTitle>
            <DialogDescription>
              Configure unit specifications, floor areas, pricing, availability, and owner details.
            </DialogDescription>
          </DialogHeader>

          {/* Unit Category Selector */}
          <div className="flex rounded-xl border border-border p-1 bg-muted/30">
            <button
              type="button"
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                unitCategory === "FLAT" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setUnitCategory("FLAT")
                setUnitForm((prev) => ({ ...prev, unitType: "FLAT", subType: "2 BHK" }))
              }}
            >
              <Home className="h-3.5 w-3.5" />
              Residential Flat
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                unitCategory === "SHOP" ? "bg-purple-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setUnitCategory("SHOP")
                setUnitForm((prev) => ({ ...prev, unitType: "SHOP", subType: "Retail Shop" }))
              }}
            >
              <Store className="h-3.5 w-3.5" />
              Commercial Shop
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                unitCategory === "OFFICE" ? "bg-sky-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setUnitCategory("OFFICE")
                setUnitForm((prev) => ({ ...prev, unitType: "OFFICE", subType: "Commercial Office" }))
              }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Office Space
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                unitCategory === "OTHER" ? "bg-muted text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setUnitCategory("OTHER")
                setUnitForm((prev) => ({ ...prev, unitType: "OTHER", subType: "Storage / Parking" }))
              }}
            >
              Other
            </button>
          </div>

          <div className="space-y-4 py-2 text-xs">
            {/* Building & Floor Selector */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="uBuilding" className="text-xs font-semibold">Building / Tower</Label>
                <Select
                  value={String(unitForm.buildingId)}
                  onValueChange={(val) => {
                    const bId = Number(val)
                    const b = buildings.find((x) => x.id === bId)
                    const firstFloorId = b?.floors?.[0]?.id || 0
                    setUnitForm({ ...unitForm, buildingId: bId, floorId: firstFloorId })
                  }}
                  disabled={Boolean(editingUnit)}
                >
                  <SelectTrigger id="uBuilding" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="uFloor" className="text-xs font-semibold">Floor</Label>
                <Select
                  value={String(unitForm.floorId)}
                  onValueChange={(val) => setUnitForm({ ...unitForm, floorId: Number(val) })}
                  disabled={Boolean(editingUnit)}
                >
                  <SelectTrigger id="uFloor" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings
                      .find((b) => b.id === unitForm.buildingId)
                      ?.floors?.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.floorName} ({f.floorNumber})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="uNo" className="text-xs font-semibold">
                  Unit Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uNo"
                  placeholder={unitCategory === "SHOP" ? "e.g. Shop 01, Shop 02" : "e.g. 101, 102, 201"}
                  value={unitForm.unitNumber}
                  onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Sub-type and Areas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="uSubType" className="text-xs font-semibold">
                  {unitCategory === "FLAT" ? "Flat Type" : unitCategory === "SHOP" ? "Shop Type" : "Category"}
                </Label>
                {unitCategory === "FLAT" ? (
                  <Select value={unitForm.subType} onValueChange={(val) => setUnitForm({ ...unitForm, subType: val })}>
                    <SelectTrigger id="uSubType" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 BHK">1 BHK</SelectItem>
                      <SelectItem value="2 BHK">2 BHK</SelectItem>
                      <SelectItem value="3 BHK">3 BHK</SelectItem>
                      <SelectItem value="4 BHK">4 BHK</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                      <SelectItem value="Duplex">Duplex</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : unitCategory === "SHOP" ? (
                  <Select value={unitForm.subType} onValueChange={(val) => setUnitForm({ ...unitForm, subType: val })}>
                    <SelectTrigger id="uSubType" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Retail Shop">Retail Shop</SelectItem>
                      <SelectItem value="Showroom">Showroom</SelectItem>
                      <SelectItem value="Cafe / Restaurant">Cafe / Restaurant</SelectItem>
                      <SelectItem value="Supermarket">Supermarket</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="Commercial Space">Commercial Space</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="uSubType"
                    placeholder="e.g. Executive Office, Storage"
                    value={unitForm.subType}
                    onChange={(e) => setUnitForm({ ...unitForm, subType: e.target.value })}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="uCarpet" className="text-xs font-semibold">Carpet Area</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    id="uCarpet"
                    type="number"
                    placeholder="e.g. 750"
                    value={unitForm.carpetArea}
                    onChange={(e) => setUnitForm({ ...unitForm, carpetArea: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={unitForm.carpetAreaUnit}
                    onValueChange={(val) => setUnitForm({ ...unitForm, carpetAreaUnit: val })}
                  >
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sq_ft">Sq. Ft.</SelectItem>
                      <SelectItem value="sq_m">Sq. Mtr.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="uBuiltUp" className="text-xs font-semibold">Built-up Area</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    id="uBuiltUp"
                    type="number"
                    placeholder="e.g. 950"
                    value={unitForm.builtUpArea}
                    onChange={(e) => setUnitForm({ ...unitForm, builtUpArea: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={unitForm.builtUpAreaUnit}
                    onValueChange={(val) => setUnitForm({ ...unitForm, builtUpAreaUnit: val })}
                  >
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sq_ft">Sq. Ft.</SelectItem>
                      <SelectItem value="sq_m">Sq. Mtr.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Flat details: Bedrooms, Bathrooms, Balconies, Facing */}
            {unitCategory === "FLAT" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border/60 pt-3">
                <div>
                  <Label htmlFor="uBed" className="text-xs font-semibold">Bedrooms</Label>
                  <Input
                    id="uBed"
                    type="number"
                    value={unitForm.bedrooms}
                    onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="uBath" className="text-xs font-semibold">Bathrooms</Label>
                  <Input
                    id="uBath"
                    type="number"
                    value={unitForm.bathrooms}
                    onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="uBalc" className="text-xs font-semibold">Balconies</Label>
                  <Input
                    id="uBalc"
                    type="number"
                    value={unitForm.balconies}
                    onChange={(e) => setUnitForm({ ...unitForm, balconies: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="uFacing" className="text-xs font-semibold">Facing / Direction</Label>
                  <Select value={unitForm.facing} onValueChange={(val) => setUnitForm({ ...unitForm, facing: val })}>
                    <SelectTrigger id="uFacing" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="East">East</SelectItem>
                      <SelectItem value="North">North</SelectItem>
                      <SelectItem value="North-East">North-East</SelectItem>
                      <SelectItem value="West">West</SelectItem>
                      <SelectItem value="South">South</SelectItem>
                      <SelectItem value="South-West">South-West</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Pricing & Status */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-border/60 pt-3">
              <div>
                <Label htmlFor="uPrice" className="text-xs font-semibold">Sale Price (INR)</Label>
                <Input
                  id="uPrice"
                  type="number"
                  placeholder="e.g. 7500000"
                  value={unitForm.price}
                  onChange={(e) => setUnitForm({ ...unitForm, price: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="uRent" className="text-xs font-semibold">Monthly Rent (Optional)</Label>
                <Input
                  id="uRent"
                  type="number"
                  placeholder="e.g. 35000"
                  value={unitForm.rentPrice}
                  onChange={(e) => setUnitForm({ ...unitForm, rentPrice: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="uStatus" className="text-xs font-semibold">Availability Status</Label>
                <Select value={unitForm.status} onValueChange={(val) => setUnitForm({ ...unitForm, status: val })}>
                  <SelectTrigger id="uStatus" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="RESERVED">Reserved</SelectItem>
                    <SelectItem value="SOLD">Sold</SelectItem>
                    <SelectItem value="RENTED">Rented</SelectItem>
                    <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Owner / Buyer Details */}
            <div className="border-t border-border/60 pt-3 space-y-2">
              <span className="text-xs font-bold text-foreground">Owner / Buyer / Tenant Information (Optional)</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Owner / Buyer Name"
                  value={unitForm.ownerName}
                  onChange={(e) => setUnitForm({ ...unitForm, ownerName: e.target.value })}
                />
                <Input
                  placeholder="Phone Number"
                  value={unitForm.ownerPhone}
                  onChange={(e) => setUnitForm({ ...unitForm, ownerPhone: e.target.value })}
                />
                <Input
                  placeholder="Email Address"
                  type="email"
                  value={unitForm.ownerEmail}
                  onChange={(e) => setUnitForm({ ...unitForm, ownerEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="uDesc" className="text-xs font-semibold">Unit Description</Label>
              <Textarea
                id="uDesc"
                rows={2}
                placeholder="Unique highlights, view (pool / garden), furnishing status..."
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUnitModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="glow-primary" onClick={handleSaveUnit} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingUnit ? "Save Changes" : "Create Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* MODAL 4: UNIT SPECIFIC DOCUMENT MANAGEMENT */}
      {/* ==================================================== */}
      <Dialog open={documentModalOpen} onOpenChange={setDocumentModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Documents for {activeUnitForDocs?.unitNumber}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({activeUnitForDocs?.unitType} · {activeUnitForDocs?.buildingName} · {activeUnitForDocs?.floorName})
              </span>
            </DialogTitle>
            <DialogDescription>
              Upload and manage legal, ownership, tax, and floor-plan documents linked specifically to this unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Upload form card */}
            <form onSubmit={handleUploadUnitDoc} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-primary" />
                Upload New Document
              </span>

              {docUploadError && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/30">
                  {docUploadError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="docName" className="text-xs font-semibold">Document Title</Label>
                  <Input
                    id="docName"
                    placeholder="e.g. Registered Sale Deed, Agreement Copy"
                    value={docUploadForm.documentName}
                    onChange={(e) => setDocUploadForm({ ...docUploadForm, documentName: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="docType" className="text-xs font-semibold">Document Category</Label>
                  <Select
                    value={docUploadForm.documentType}
                    onValueChange={(val) => setDocUploadForm({ ...docUploadForm, documentType: val })}
                  >
                    <SelectTrigger id="docType" className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="docFile" className="text-xs font-semibold">Choose File (PDF, PNG, JPG, WebP - max 50MB)</Label>
                <Input
                  id="docFile"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setDocUploadFile(e.target.files?.[0] || null)}
                  className="mt-1 text-xs cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="glow-primary text-xs gap-1.5" disabled={docUploading}>
                  {docUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload Document
                </Button>
              </div>
            </form>

            {/* List of uploaded documents */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-foreground">
                Uploaded Documents ({(unitDocsQuery.data || []).length})
              </span>

              {unitDocsQuery.isLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  Loading unit documents...
                </div>
              ) : (unitDocsQuery.data || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No documents uploaded for this unit yet.
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-xl border border-border bg-background overflow-hidden">
                  {(unitDocsQuery.data || []).map((doc) => {
                    const downloadUrl = doc.fileUrl || estateApi.properties.downloadUnitDocumentUrl(propertyId, doc.unitId, doc.id)

                    return (
                      <div key={doc.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-foreground truncate">{doc.documentName}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="rounded bg-muted px-1.5 py-0.2 font-medium">
                                {DOCUMENT_CATEGORIES.find((c) => c.value === doc.documentType)?.label || doc.documentType}
                              </span>
                              {doc.fileSize ? <span>{(doc.fileSize / 1024).toFixed(0)} KB</span> : null}
                              {doc.createdAt ? <span>Uploaded {doc.createdAt.slice(0, 10)}</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUnitDoc(doc.id, doc.documentName)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDocumentModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
