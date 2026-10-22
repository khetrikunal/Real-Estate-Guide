"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileText,
  FolderArchive,
  Grid,
  Home,
  ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  MapPin,
  Maximize2,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  User,
  X,
  AlertTriangle,
} from "lucide-react"

import { PageContainer } from "@/components/shell/page-header"
import { MapPickerCard } from "@/components/property/map-picker-card"
import { SectionCard } from "@/components/shell/section-card"
import { Button } from "@/components/ui/button"
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
import { RevealSection } from "@app/motion"
import { mediaUrl } from "@/lib/media-url"
import { cn } from "@/lib/utils"
import "@/components/property/add-project-a11y.css"

type RoleParams = { role: string; id?: string } | Promise<{ role: string; id?: string }>

type SaveState = "idle" | "saving" | "saved"
export type PropertyCategory = "Land" | "Residential" | "Commercial" | "Other"
type ApiRecord = Record<string, unknown>

interface PlotItem {
  id: string
  plotNumber: string
  area: string
  dimensions: string
  facing: string
  price: string
  status: "Available" | "Booked" | "Sold"
  notes: string
}

interface UnitItem {
  id: string
  towerName?: string
  floorNumber: number
  unitNumber: string
  unitType: string
  carpetArea: string
  bedrooms: number
  bathrooms: number
  price: string
  status: "Available" | "Booked" | "Sold"
}

interface DocUploadItem {
  id: string
  file: File
  name: string
  category: string
  level: "PROPERTY" | "BUILDING" | "TOWER" | "UNIT"
  towerName?: string
}

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

const landSubcategories = [
  "NA Plot",
  "Non-NA Plot",
  "Agricultural Land",
  "MIDC Industrial Plot",
  "Commercial Plot",
  "Farm House Plot",
  "Residential Layout Plot",
  "Other",
] as const

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
  "Villa / Bungalow",
  "Row House",
] as const

const commercialSubcategories = [
  "Shop / Retail",
  "Office",
  "Warehouse / Industrial",
  "Showroom",
  "Hall / Banquet",
  "Hospitality / Hotel",
  "Institutional / Medical",
  "Other",
] as const

const otherSubcategories = [
  "Mixed Use Development",
  "Resort / Hospitality",
  "Farmhouse & Villa",
  "Educational / Institutional",
  "Special Economic Zone",
  "Other",
] as const

const areaUnits = [
  { value: "sq_ft", label: "Sq. Ft." },
  { value: "sq_m", label: "Sq. Mtr." },
  { value: "acres", label: "Acres" },
  { value: "guntha", label: "Guntha" },
  { value: "bigha", label: "Bigha" },
  { value: "hectares", label: "Hectares" },
]

const ownershipTypes = [
  "Freehold",
  "Leasehold",
  "Power of Attorney (POA)",
  "Ancestral / Inherited",
  "Co-operative Housing Society",
  "Government / Municipal Allotted",
  "Other",
]

function getSubcategoriesFor(category: PropertyCategory): readonly string[] {
  if (category === "Land") return landSubcategories
  if (category === "Residential") return residentialSubcategories
  if (category === "Commercial") return commercialSubcategories
  return otherSubcategories
}

function normalizeProjectStatus(v: string) {
  return v.trim().replace(/\s+/g, "_")
}

function isPromiseParams(params: RoleParams): params is Promise<{ role: string; id?: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
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

function firstNumber(record: ApiRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function numericId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim()
  return ""
}

export default function NewProjectPage({ params }: { params: RoleParams }) {
  const { role, id } = isPromiseParams(params) ? use(params) : params
  return <NewProjectContent role={role} editProjectId={id} />
}

const STEPS = [
  { id: 1, title: "Category", description: "Select Property Type" },
  { id: 2, title: "Information", description: "Details & Location" },
  { id: 3, title: "Configuration", description: "Plots or Tower Units" },
  { id: 4, title: "Documents", description: "Legal & Media" },
  { id: 5, title: "Review", description: "Summary & Create" },
]

function NewProjectContent({ role, editProjectId }: { role: string; editProjectId?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const auth = useAuth()
  const isEditMode = Boolean(editProjectId)

  const [activeStep, setActiveStep] = useState(1)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  // Step 1: Category Selection
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>("Residential")

  // Step 2: Shared & Conditional Fields
  const [propertyTitle, setPropertyTitle] = useState("") // For Land (optional) or Project Name (mandatory for buildings)
  const [description, setDescription] = useState("")
  const [propertySubcategory, setPropertySubcategory] = useState<string>("Flats / Apartments")
  const [price, setPrice] = useState("")
  const [pricePerSqFt, setPricePerSqFt] = useState("")

  // Location fields
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("Maharashtra")
  const [area, setArea] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [googleMapsUrl, setGoogleMapsUrl] = useState("")
  const [coords, setCoords] = useState({ lat: 18.5204, lng: 73.8567 })
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")

  // Land / Plot Specific Fields
  const [plotNumber, setPlotNumber] = useState("")
  const [surveyNumber, setSurveyNumber] = useState("")
  const [plotDimensions, setPlotDimensions] = useState("")
  const [totalLandArea, setTotalLandArea] = useState("")
  const [totalLandAreaUnit, setTotalLandAreaUnit] = useState("sq_ft")
  const [ownershipType, setOwnershipType] = useState("Freehold")

  // Building / Multi-Tower Specific Fields
  const [builderName, setBuilderName] = useState("")
  const [builderNumber, setBuilderNumber] = useState("")
  const [builderEmail, setBuilderEmail] = useState("")
  const [hasMultipleTowers, setHasMultipleTowers] = useState(false)
  const [towerCount, setTowerCount] = useState(2)
  const [towersList, setTowersList] = useState<string[]>(["Tower A", "Tower B"])
  const [totalFloors, setTotalFloors] = useState(4)
  const [totalBuiltUpArea, setTotalBuiltUpArea] = useState("")
  const [projectStatus, setProjectStatus] = useState<string>("Ready_to_Move")
  const [possessionDate, setPossessionDate] = useState<string>("")
  const [propertyCode, setPropertyCode] = useState("")

  // Step 3: Conditional Configurations State
  // A. Land Plots
  const [plots, setPlots] = useState<PlotItem[]>([
    {
      id: "plot-1",
      plotNumber: "Plot 1",
      area: "2400",
      dimensions: "60 x 40 ft",
      facing: "East",
      price: "",
      status: "Available",
      notes: "Corner plot facing 30ft road",
    },
  ])

  // B. Multi-Tower / Single Building Units
  const [activeTowerIndex, setActiveTowerIndex] = useState(0)
  const [units, setUnits] = useState<UnitItem[]>([
    {
      id: "unit-1",
      towerName: "Tower A",
      floorNumber: 1,
      unitNumber: "101",
      unitType: "2 BHK Flat",
      carpetArea: "850",
      bedrooms: 2,
      bathrooms: 2,
      price: "",
      status: "Available",
    },
    {
      id: "unit-2",
      towerName: "Tower A",
      floorNumber: 1,
      unitNumber: "102",
      unitType: "3 BHK Flat",
      carpetArea: "1250",
      bedrooms: 3,
      bathrooms: 3,
      price: "",
      status: "Available",
    },
  ])

  // Step 4: Documents and Media
  const [uploadedDocs, setUploadedDocs] = useState<DocUploadItem[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState("")

  // Quick Add Location dialog
  const [quickAddLocationOpen, setQuickAddLocationOpen] = useState(false)
  const [quickLocationForm, setQuickLocationForm] = useState({
    state: "Maharashtra",
    city: "",
    area: "",
    subscriptionRate: "",
  })
  const [quickLocationError, setQuickLocationError] = useState("")

  // Edit hydration & existing configs
  const [existingConfigs, setExistingConfigs] = useState<ApiRecord[]>([])
  const [editHydrated, setEditHydrated] = useState(false)

  const isLocationBasedSubadmin =
    auth.role === "subadmin" &&
    String(auth.user?.subscriptionType ?? "").toLowerCase() === "location_based"
  const assignedCity = typeof auth.user?.assignedCity === "string" ? auth.user.assignedCity : ""
  const assignedState = typeof auth.user?.assignedState === "string" ? auth.user.assignedState : ""
  const assignedArea = typeof auth.user?.assignedArea === "string" ? auth.user.assignedArea : ""

  const locationsQuery = useQuery({
    queryKey: ["v0", "locations"],
    queryFn: async () => {
      const res = await estateApi.locations.list()
      return Array.isArray(res) ? res : []
    },
    enabled: auth.ready && Boolean(auth.token),
    staleTime: 10_000,
  })

  const availableLocations = useMemo(() => {
    return asRecords(locationsQuery.data)
      .map((record) => {
        const id = firstString(record, ["id", "locationId", "_id"])
        const locState = firstString(record, ["state"], "").trim()
        const locCity = firstString(record, ["city"], "").trim()
        const locArea = firstString(record, ["area"], "").trim()
        const locRate = firstNumber(record, ["subscriptionRate", "rate", "monthlyRate", "pricing", "price"], 0)
        return {
          id,
          state: locState,
          city: locCity,
          area: locArea,
          pricing: locRate,
          label: `${locState} → ${locCity} → ${locArea}`,
        }
      })
      .filter((l) => l.id && l.state && l.city && l.area && l.city !== "-" && l.area !== "-")
  }, [locationsQuery.data])

  const editProjectQuery = useQuery({
    queryKey: ["v0", "project-edit", editProjectId],
    queryFn: () => estateApi.projects.detail(editProjectId || ""),
    enabled: auth.ready && Boolean(auth.token) && isEditMode && Boolean(editProjectId),
    staleTime: 0,
  })

  // Hydrate edit mode
  useEffect(() => {
    if (!isEditMode || editHydrated || !editProjectQuery.data || !isRecord(editProjectQuery.data)) return
    const project = editProjectQuery.data

    const rawCategory = firstString(project, ["propertyCategory"], "Residential")
    let category: PropertyCategory = "Residential"
    if (rawCategory.toLowerCase().includes("land") || rawCategory.toLowerCase().includes("plot")) {
      category = "Land"
    } else if (rawCategory.toLowerCase().includes("commercial")) {
      category = "Commercial"
    } else if (rawCategory.toLowerCase().includes("other")) {
      category = "Other"
    }
    setPropertyCategory(category)

    setPropertyTitle(firstString(project, ["projectName", "name", "propertyName"]))
    setDescription(firstString(project, ["description"]))
    setPropertySubcategory(firstString(project, ["propertySubcategory"], getSubcategoriesFor(category)[0]))
    setBuilderName(firstString(project, ["builderName", "builder", "developerName"]))
    setBuilderNumber(firstString(project, ["builderNumber", "builderContact", "builderPhone"]))
    setBuilderEmail(firstString(project, ["builderEmail", "email"]))

    setPlotNumber(firstString(project, ["plotNumber"]))
    setSurveyNumber(firstString(project, ["surveyNumber"]))
    setPlotDimensions(firstString(project, ["plotDimensions"]))
    setOwnershipType(firstString(project, ["ownershipType"], "Freehold"))
    setHasMultipleTowers(Boolean(project.hasMultipleTowers))
    if (project.towerCount && Number(project.towerCount) > 0) {
      setTowerCount(Number(project.towerCount))
    }

    setTotalLandArea(firstString(project, ["totalLandArea"]))
    setTotalLandAreaUnit(firstString(project, ["totalLandAreaUnit"], "sq_ft"))
    setTotalBuiltUpArea(firstString(project, ["totalBuiltUpArea"]))
    setPropertyCode(firstString(project, ["propertyCode", "code"]))

    const initialLocId = numericId(project.locationId) || numericId(firstString(project, ["locationId", "location_id"]))
    if (initialLocId) setSelectedLocationId(initialLocId)

    setAddress(firstString(project, ["address"]))
    setCity(firstString(project, ["city"]))
    setState(firstString(project, ["state"], "Maharashtra"))
    setArea(firstString(project, ["area", "locality"]))
    setZipCode(firstString(project, ["zipCode", "pincode", "postalCode"]))
    setGoogleMapsUrl(firstString(project, ["googleMapsUrl", "mapUrl"]))

    if (project.price) setPrice(String(project.price))
    if (project.pricePerSqFt) setPricePerSqFt(String(project.pricePerSqFt))

    setProjectStatus(firstString(project, ["projectStatus"], "Ready_to_Move"))
    if (project.possessionDate) {
      setPossessionDate(String(project.possessionDate).slice(0, 10))
    }

    setExistingCoverUrl(mediaUrl(firstString(project, ["coverPhotoUrl", "cover", "coverPhoto", "imageUrl", "thumbnailUrl"])))

    const lat = Number(project.latitude)
    const lng = Number(project.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCoords({ lat, lng })
    }

    const configs = asRecords(project.configs)
    if (configs.length) {
      setExistingConfigs(configs)
    }

    setEditHydrated(true)
  }, [editHydrated, editProjectQuery.data, isEditMode])

  // Subadmin assigned location scope
  useEffect(() => {
    if (!isLocationBasedSubadmin) return
    if (assignedState) setState(assignedState)
    if (assignedCity) setCity(assignedCity)
    if (assignedArea) setArea(assignedArea)
  }, [assignedArea, assignedCity, assignedState, isLocationBasedSubadmin])

  // Match location selection
  useEffect(() => {
    if (!selectedLocationId && city && state && area && availableLocations.length > 0) {
      const match = availableLocations.find(
        (l) =>
          l.state.toLowerCase() === state.toLowerCase() &&
          l.city.toLowerCase() === city.toLowerCase() &&
          l.area.toLowerCase() === area.toLowerCase(),
      )
      if (match) setSelectedLocationId(match.id)
    }
  }, [availableLocations, selectedLocationId, city, state, area])

  // Cover image preview
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  // Synchronize tower list when tower count changes
  useEffect(() => {
    if (hasMultipleTowers && towerCount > 0) {
      setTowersList((prev) => {
        const next = [...prev]
        while (next.length < towerCount) {
          const letter = String.fromCharCode(65 + next.length)
          next.push(`Tower ${letter}`)
        }
        return next.slice(0, towerCount)
      })
    }
  }, [hasMultipleTowers, towerCount])

  const handleLocationSelect = (locId: string) => {
    setSelectedLocationId(locId)
    const loc = availableLocations.find((l) => l.id === locId)
    if (loc) {
      setState(loc.state)
      setCity(loc.city)
      setArea(loc.area)
      if (validationErrors.location) {
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next.location
          return next
        })
      }
    }
  }

  // Handle Category Change safely
  const handleCategoryChange = (category: PropertyCategory) => {
    setPropertyCategory(category)
    const subcats = getSubcategoriesFor(category)
    setPropertySubcategory(subcats[0])

    // Clean up incompatible validation errors
    setValidationErrors({})
    setErrorMessage(null)
  }

  // Real-time validations based on category
  const validateStep = (stepNumber: number): boolean => {
    const errors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!propertyCategory) {
        errors.propertyCategory = "Please select a property category to proceed"
      }
    }

    if (stepNumber === 2) {
      // For Buildings / Commercial, project title/name is required. For Land, it is optional.
      if (propertyCategory !== "Land") {
        if (!propertyTitle.trim()) {
          errors.propertyTitle = "Project / Building name is required"
        } else if (propertyTitle.trim().length < 2) {
          errors.propertyTitle = "Name must be at least 2 characters"
        }
      }

      // Address & location check
      if (!address.trim()) {
        errors.address = propertyCategory === "Land" ? "Plot / Land address is required" : "Building address is required"
      }
      if (!selectedLocationId && !city.trim()) {
        errors.location = "Please select or enter a city / locality"
      }

      if (builderNumber.trim()) {
        const cleanPhone = builderNumber.replace(/[\s-]/g, "")
        const phoneRegex = /^(?:\+?91|0)?[6-9]\d{9}$/
        if (!phoneRegex.test(cleanPhone)) {
          errors.builderNumber = "Please enter a valid 10-digit mobile number"
        }
      }

      if (googleMapsUrl.trim()) {
        try {
          const parsed = new URL(googleMapsUrl.trim())
          if (!parsed.protocol.startsWith("http")) {
            errors.googleMapsUrl = "URL must begin with http:// or https://"
          }
        } catch {
          errors.googleMapsUrl = "Please enter a valid map URL"
        }
      }
    }

    if (stepNumber === 3) {
      if (propertyCategory === "Land") {
        if (plots.length === 0) {
          errors.plots = "At least one land plot or parcel must be configured."
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length))
      setErrorMessage(null)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePrevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1))
    setErrorMessage(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // --- Configuration Management Helpers ---
  // A. Land Plot Helpers
  const addPlot = () => {
    const nextPlotNo = plots.length + 1
    const newPlot: PlotItem = {
      id: `plot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      plotNumber: `Plot ${nextPlotNo}`,
      area: totalLandArea || "2000",
      dimensions: plotDimensions || "50 x 40 ft",
      facing: "East",
      price: price || "",
      status: "Available",
      notes: "",
    }
    setPlots((prev) => [...prev, newPlot])
  }

  const updatePlot = (id: string, updates: Partial<PlotItem>) => {
    setPlots((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const removePlot = (id: string) => {
    setPlots((prev) => prev.filter((p) => p.id !== id))
  }

  // B. Multi-Tower / Unit Helpers
  const addTower = () => {
    const nextLetter = String.fromCharCode(65 + towersList.length)
    const newTowerName = `Tower ${nextLetter}`
    setTowersList((prev) => [...prev, newTowerName])
    setTowerCount((prev) => prev + 1)
  }

  const removeTower = (index: number) => {
    if (towersList.length <= 1) return
    const towerToRemove = towersList[index]
    setTowersList((prev) => prev.filter((_, i) => i !== index))
    setTowerCount((prev) => Math.max(1, prev - 1))
    // Also remove units attached to this tower
    setUnits((prev) => prev.filter((u) => u.towerName !== towerToRemove))
    if (activeTowerIndex >= towersList.length - 1) {
      setActiveTowerIndex(Math.max(0, towersList.length - 2))
    }
  }

  const updateTowerName = (index: number, newName: string) => {
    const oldName = towersList[index]
    setTowersList((prev) => {
      const copy = [...prev]
      copy[index] = newName
      return copy
    })
    // Update attached units
    setUnits((prev) => prev.map((u) => (u.towerName === oldName ? { ...u, towerName: newName } : u)))
  }

  const addUnit = (targetTower?: string) => {
    const activeTowerName = targetTower || (hasMultipleTowers ? towersList[activeTowerIndex] : undefined)
    const nextUnitNo = `${(units.length % 10) + 1}0${units.length + 1}`
    const newUnit: UnitItem = {
      id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      towerName: activeTowerName,
      floorNumber: 1,
      unitNumber: nextUnitNo,
      unitType: propertyCategory === "Commercial" ? "Shop" : "2 BHK Flat",
      carpetArea: "850",
      bedrooms: propertyCategory === "Commercial" ? 0 : 2,
      bathrooms: 2,
      price: price || "",
      status: "Available",
    }
    setUnits((prev) => [...prev, newUnit])
  }

  const updateUnit = (id: string, updates: Partial<UnitItem>) => {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }

  const removeUnit = (id: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== id))
  }

  // C. Document File Upload Handlers
  const handleDocFileUpload = (
    files: FileList | null,
    category: string,
    level: "PROPERTY" | "BUILDING" | "TOWER" | "UNIT" = "PROPERTY",
    towerName?: string,
  ) => {
    if (!files || files.length === 0) return
    const newDocs: DocUploadItem[] = Array.from(files).map((f) => ({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      name: f.name,
      category,
      level,
      towerName,
    }))
    setUploadedDocs((prev) => [...prev, ...newDocs])
  }

  const removeDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id))
  }

  // --- Master Save Action ---
  const handleSaveProperty = async () => {
    // Validate required steps
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        setActiveStep(s)
        setErrorMessage("Please complete the required fields in this step.")
        return
      }
    }

    setSaveState("saving")
    setErrorMessage(null)

    try {
      const locMatch = availableLocations.find((l) => l.id === selectedLocationId)

      // Derive fallback title for Land if blank
      let resolvedProjectName = propertyTitle.trim()
      if (!resolvedProjectName) {
        if (propertyCategory === "Land") {
          resolvedProjectName = plotNumber.trim()
            ? `Plot ${plotNumber.trim()}`
            : surveyNumber.trim()
            ? `Survey No. ${surveyNumber.trim()}`
            : area.trim()
            ? `Land Parcel at ${area.trim()}`
            : "Land Parcel"
        } else {
          resolvedProjectName = "Unnamed Project"
        }
      }

      // Map plots into configs for Land so that inventory and listing work natively!
      const mappedConfigs =
        propertyCategory === "Land"
          ? plots.map((p, idx) => ({
              configLabel: p.plotNumber || `Plot ${idx + 1}`,
              propertyType: "Plot",
              listingType: "Sale",
              units: 1,
              unitsSold: p.status === "Sold" ? 1 : 0,
              price: Number(p.price) || Number(price) || 0,
              carpetAreaSqft: Number(p.area) || Number(totalLandArea) || 0,
              floorNo: "0",
              flatType: "Plot",
              unitLabels: [p.plotNumber || `Plot ${idx + 1}`],
            }))
          : isEditMode && existingConfigs.length > 0
          ? existingConfigs
          : units.map((u) => ({
              configLabel: `${u.towerName ? `${u.towerName} - ` : ""}Unit ${u.unitNumber} (${u.unitType})`,
              propertyType: u.unitType,
              listingType: "Sale",
              units: 1,
              unitsSold: u.status === "Sold" ? 1 : 0,
              price: Number(u.price) || Number(price) || 0,
              carpetAreaSqft: Number(u.carpetArea) || 0,
              floorNo: u.floorNumber,
              flatType: u.unitType,
            }))

      const projectPayload = {
        projectName: resolvedProjectName,
        locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
        description: description.trim(),
        builderName: builderName.trim() || undefined,
        builderNumber: builderNumber.trim() || undefined,
        builderEmail: builderEmail.trim() || undefined,
        propertyType: propertyCategory === "Land" ? "Plot" : propertyCategory,
        apartmentName: hasMultipleTowers ? `${towersList.length} Towers` : undefined,

        // Land & Plot specific
        plotNumber: plotNumber.trim() || undefined,
        surveyNumber: surveyNumber.trim() || undefined,
        plotDimensions: plotDimensions.trim() || undefined,
        ownershipType: ownershipType.trim() || undefined,
        totalLandArea: totalLandArea ? Number(totalLandArea) : undefined,
        totalLandAreaUnit: totalLandAreaUnit.trim(),

        // Building & Tower specific
        hasMultipleTowers: propertyCategory !== "Land" ? hasMultipleTowers : false,
        towerCount: propertyCategory !== "Land" && hasMultipleTowers ? towersList.length : undefined,
        totalBuiltUpArea: totalBuiltUpArea ? Number(totalBuiltUpArea) : undefined,
        propertyCode: propertyCode.trim() || undefined,

        // Category & Subcategory
        propertyCategory,
        propertySubcategory,
        possessionDate: possessionDate || undefined,
        projectStatus: normalizeProjectStatus(projectStatus),

        // Address & Geography
        address: address.trim(),
        city: locMatch?.city || city.trim(),
        area: locMatch?.area || area.trim(),
        state: locMatch?.state || state.trim(),
        zipCode: zipCode.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        status: "active",
        price: Number(price) || 0,
        pricePerSqFt: Number(pricePerSqFt) || undefined,
        totalUnits: propertyCategory === "Land" ? plots.length : units.length,
        completionPercentage: projectStatus === "Ready_to_Move" ? 100 : 50,
        configs: mappedConfigs,
      }

      const result = (isEditMode && editProjectId
        ? await estateApi.projects.update(editProjectId, projectPayload)
        : await estateApi.projects.create(projectPayload)) as Record<string, unknown>

      const resolvedId = result?.id ?? result?.projectId ?? editProjectId

      // If Building with multiple towers, create Building / Tower records in PropertyManagement API
      if (resolvedId && propertyCategory !== "Land") {
        try {
          if (hasMultipleTowers) {
            for (const towerName of towersList) {
              await estateApi.properties.createBuilding(resolvedId as any, {
                name: towerName,
                towerCode: towerName.replace(/\s+/g, "_").toUpperCase(),
                buildingType: propertyCategory === "Commercial" ? "COMMERCIAL" : "RESIDENTIAL",
                totalFloors: totalFloors || 4,
                description: `${towerName} in ${resolvedProjectName}`,
              })
            }
          } else {
            await estateApi.properties.createBuilding(resolvedId as any, {
              name: resolvedProjectName,
              buildingType: propertyCategory === "Commercial" ? "COMMERCIAL" : "RESIDENTIAL",
              totalFloors: totalFloors || 4,
              description: description || "Main Building",
            })
          }
        } catch (towerErr) {
          console.warn("Could not auto-create building records:", towerErr)
        }
      }

      // Upload Cover Photo if selected
      if (resolvedId && coverFile) {
        const formData = new FormData()
        formData.append("file", coverFile)
        const uploadedBy = auth.user?.id ?? auth.user?.userId
        if (uploadedBy !== undefined && uploadedBy !== null) {
          formData.append("uploadedBy", String(uploadedBy))
        }
        try {
          await estateApi.projects.uploadCover(String(resolvedId), formData)
        } catch {
          try {
            await estateApi.documents.uploadCover(String(resolvedId), formData)
          } catch (e) {
            console.warn("Cover photo upload skipped:", e)
          }
        }
      }

      // Upload Category-Specific Documents
      if (resolvedId && uploadedDocs.length > 0) {
        for (const docItem of uploadedDocs) {
          const docFormData = new FormData()
          docFormData.append("files", docItem.file)
          if (auth.user?.id) docFormData.append("uploadedBy", String(auth.user.id))
          try {
            await estateApi.projects.uploadDocument(String(resolvedId), docFormData, {
              documentLevel: docItem.level,
              documentCategory: docItem.category,
            })
          } catch (docErr) {
            console.warn(`Document ${docItem.name} upload error:`, docErr)
          }
        }
      }

      setSaveState("saved")

      // Invalidate relevant query caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["v0", "projects-data"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "project-detail", String(resolvedId)] }),
        queryClient.invalidateQueries({ queryKey: ["v0", "project-edit", String(resolvedId)] }),
      ])

      // Redirect to configurations dashboard
      navigate(`/${role}/properties/${resolvedId}/configurations`)
    } catch (err) {
      setSaveState("idle")
      setErrorMessage(err instanceof Error ? err.message : "Could not save property. Please check details and try again.")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleQuickAddLocation = async () => {
    if (!quickLocationForm.city.trim()) {
      setQuickLocationError("City is required")
      return
    }
    if (!quickLocationForm.area.trim()) {
      setQuickLocationError("Area is required")
      return
    }
    try {
      const created = (await estateApi.locations.create({
        state: quickLocationForm.state,
        city: quickLocationForm.city.trim(),
        area: quickLocationForm.area.trim(),
        subscriptionRate: Number(quickLocationForm.subscriptionRate) || 0,
      })) as Record<string, unknown>

      await locationsQuery.refetch()
      if (created?.id) {
        handleLocationSelect(String(created.id))
      }
      setQuickAddLocationOpen(false)
      setQuickLocationForm({ state: "Maharashtra", city: "", area: "", subscriptionRate: "" })
      setQuickLocationError("")
    } catch (e) {
      setQuickLocationError(e instanceof Error ? e.message : "Failed to add location")
    }
  }

  // Category card options for Step 1
  const categoryOptions = [
    {
      type: "Land" as PropertyCategory,
      title: "Land / Plot",
      badge: "Standalone Parcels",
      description: "Individual land parcels, agricultural plots, NA plots, commercial layouts, or survey lands for sale.",
      icon: MapPin,
      gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
      accent: "text-amber-400 border-amber-500/40 bg-amber-500/10",
      features: ["No project name required", "Survey / Gut number support", "Dimensions & Area in Guntha/Acres", "7/12 & Legal documents"],
    },
    {
      type: "Residential" as PropertyCategory,
      title: "Building / Residential Project",
      badge: "Single & Multi-Tower",
      description: "Standalone residential buildings, gated communities, housing societies, or multi-tower residential towers.",
      icon: Building2,
      gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
      accent: "text-blue-400 border-blue-500/40 bg-blue-500/10",
      features: ["Single building or multi-tower", "Floor & Unit management", "Apartments, Studio, 1-5 BHK", "Sanctioned plans & CC/OC"],
    },
    {
      type: "Commercial" as PropertyCategory,
      title: "Commercial Property",
      badge: "Offices & Retail",
      description: "Commercial complexes, shopping complexes, corporate offices, industrial spaces, showrooms, and warehouses.",
      icon: Store,
      gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      accent: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
      features: ["Retail shops & Corporate offices", "Multi-wing commercial support", "Carpet & Super Built-up area", "Commercial approvals & Fire NOC"],
    },
    {
      type: "Other" as PropertyCategory,
      title: "Other Property Types",
      badge: "Special Purpose",
      description: "Mixed-use developments, farmhouse estates, resorts, institutional plots, or special economic zones.",
      icon: LayoutGrid,
      gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
      accent: "text-purple-400 border-purple-500/40 bg-purple-500/10",
      features: ["Customizable hierarchy", "Multi-purpose zoning", "Bespoke unit configurations", "Comprehensive document vault"],
    },
  ]

  return (
    <PageContainer className="reference-add-project-page max-w-5xl py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <Link href={`/${role}/properties`}>
              <ArrowLeft className="h-4 w-4" />
              Back to properties
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEditMode ? "Edit Property" : "Add Property Listing"}
            </h1>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
              {propertyCategory === "Land" ? "Land / Plot" : propertyCategory}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEditMode
              ? "Update property details and configurations."
              : "Step-by-step intelligent property creation with category-driven workflow."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscardDialogOpen(true)}
            disabled={saveState === "saving"}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="glow-primary gap-1.5"
            onClick={handleSaveProperty}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditMode ? "Saving Changes..." : "Creating Property..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isEditMode
                  ? "Save Changes"
                  : propertyCategory === "Land"
                  ? "Create Land Listing"
                  : hasMultipleTowers
                  ? "Create Multi-Tower Project"
                  : "Create Building"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="mt-6 border-b border-border/60 pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STEPS.map((step) => {
            const isCompleted = activeStep > step.id
            const isCurrent = activeStep === step.id

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < activeStep || validateStep(activeStep)) {
                    setActiveStep(step.id)
                  }
                }}
                className={`group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                  isCurrent
                    ? "bg-primary/10 border-primary/40 border shadow-sm"
                    : isCompleted
                    ? "bg-muted/40 border border-transparent hover:bg-muted/70"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <div className="min-w-0">
                  <div
                    className={`truncate text-xs font-semibold ${
                      isCurrent ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">{step.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive flex items-center gap-2.5">
          <X className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP CONTENT */}
      <div className="mt-6">
        {/* ========================================================================= */}
        {/* STEP 1: Select Property Category First                                    */}
        {/* ========================================================================= */}
        {activeStep === 1 && (
          <RevealSection>
            <SectionCard
              eyebrow="Step 1 of 5"
              title="Select Property Category"
              description="Choose the type of real estate property you want to add. Subsequent steps and configurations adapt automatically."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {categoryOptions.map((opt) => {
                  const isSelected = propertyCategory === opt.type
                  const Icon = opt.icon

                  return (
                    <div
                      key={opt.type}
                      onClick={() => handleCategoryChange(opt.type)}
                      className={cn(
                        "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                          : "border-border/80 bg-card/60 hover:border-primary/50 hover:bg-muted/40",
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", opt.accent)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {opt.badge}
                          </span>
                        </div>

                        <h3 className="mt-3.5 text-base font-bold text-foreground">{opt.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{opt.description}</p>
                      </div>

                      <div className="mt-4 border-t border-border/40 pt-3">
                        <div className="grid grid-cols-2 gap-1.5">
                          {opt.features.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                              <Check className="h-3 w-3 text-primary shrink-0" />
                              <span className="truncate">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {validationErrors.propertyCategory && (
                <p className="mt-2 text-xs text-destructive">{validationErrors.propertyCategory}</p>
              )}

              <div className="mt-6 flex justify-end">
                <Button size="sm" onClick={handleNextStep} className="gap-1.5 glow-primary">
                  Continue with {categoryOptions.find((c) => c.type === propertyCategory)?.title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </SectionCard>
          </RevealSection>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Property Information Based on Category                            */}
        {/* ========================================================================= */}
        {activeStep === 2 && (
          <RevealSection>
            {/* Condition A: Land / Plot Information */}
            {propertyCategory === "Land" ? (
              <SectionCard
                eyebrow="Step 2 of 5"
                title="Land & Plot Information"
                description="Specify land dimensions, survey coordinates, pricing, and ownership details. Project name is optional."
              >
                <div className="space-y-5">
                  {/* Property Title / Plot Reference (Optional for Land) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="propertyTitle" className="text-sm font-semibold">
                        Property Title or Plot Reference <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">{propertyTitle.length}/150</span>
                    </div>
                    <Input
                      id="propertyTitle"
                      placeholder="e.g. Silver Springs Plot 14, Highway Commercial Land (Optional)"
                      value={propertyTitle}
                      maxLength={150}
                      onChange={(e) => setPropertyTitle(e.target.value)}
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      If left blank, a title will automatically be created from plot or location details.
                    </p>
                  </div>

                  {/* Subcategory & Ownership */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="propertySubcategory" className="text-sm font-semibold">
                        Land Subcategory <span className="text-destructive">*</span>
                      </Label>
                      <Select value={propertySubcategory} onValueChange={setPropertySubcategory}>
                        <SelectTrigger id="propertySubcategory" className="mt-1.5">
                          <SelectValue placeholder="Select Land Subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {landSubcategories.map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ownershipType" className="text-sm font-semibold">
                        Ownership & Legal Status
                      </Label>
                      <Select value={ownershipType} onValueChange={setOwnershipType}>
                        <SelectTrigger id="ownershipType" className="mt-1.5">
                          <SelectValue placeholder="Select Ownership Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ownershipTypes.map((ot) => (
                            <SelectItem key={ot} value={ot}>
                              {ot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Plot & Survey Identification */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="plotNumber" className="text-sm font-semibold">
                        Plot / Parcel Number
                      </Label>
                      <Input
                        id="plotNumber"
                        placeholder="e.g. Plot No. 42"
                        value={plotNumber}
                        onChange={(e) => setPlotNumber(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="surveyNumber" className="text-sm font-semibold">
                        Survey / Gut Number
                      </Label>
                      <Input
                        id="surveyNumber"
                        placeholder="e.g. Gut No. 128/3B"
                        value={surveyNumber}
                        onChange={(e) => setSurveyNumber(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="plotDimensions" className="text-sm font-semibold">
                        Plot Dimensions
                      </Label>
                      <Input
                        id="plotDimensions"
                        placeholder="e.g. 60 ft x 40 ft"
                        value={plotDimensions}
                        onChange={(e) => setPlotDimensions(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Area & Pricing */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="totalLandArea" className="text-sm font-semibold">
                        Total Land Area
                      </Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="totalLandArea"
                          type="number"
                          placeholder="e.g. 2400"
                          value={totalLandArea}
                          onChange={(e) => setTotalLandArea(e.target.value)}
                          className="flex-1"
                        />
                        <Select value={totalLandAreaUnit} onValueChange={setTotalLandAreaUnit}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {areaUnits.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="price" className="text-sm font-semibold">
                        Asking Price (₹)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="e.g. 3500000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pricePerSqFt" className="text-sm font-semibold">
                        Rate per Unit (₹)
                      </Label>
                      <Input
                        id="pricePerSqFt"
                        type="number"
                        placeholder="e.g. 1500"
                        value={pricePerSqFt}
                        onChange={(e) => setPricePerSqFt(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Location & Address */}
                  <div className="border-t border-border/40 pt-4">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      Location & Land Address
                    </h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor="address" className="text-sm font-semibold">
                          Plot Address / Road / Landmark <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="address"
                          placeholder="e.g. Near Talegaon Toll Plaza, Old Mumbai-Pune Highway"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value)
                            if (validationErrors.address) {
                              setValidationErrors((prev) => {
                                const n = { ...prev }
                                delete n.address
                                return n
                              })
                            }
                          }}
                          className={cn("mt-1.5", validationErrors.address && "border-destructive")}
                        />
                        {validationErrors.address && (
                          <p className="mt-1 text-xs text-destructive">{validationErrors.address}</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="location-select" className="text-sm font-semibold">
                            Territory / City / Area <span className="text-destructive">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setQuickAddLocationOpen(true)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Quick Add
                          </button>
                        </div>
                        <Select value={selectedLocationId} onValueChange={handleLocationSelect}>
                          <SelectTrigger id="location-select" className="mt-1.5">
                            <SelectValue placeholder="Select city and territory" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.location && (
                          <p className="mt-1 text-xs text-destructive">{validationErrors.location}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="zipCode" className="text-sm font-semibold">
                          Pincode
                        </Label>
                        <Input
                          id="zipCode"
                          placeholder="e.g. 410507"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {/* Google Maps Coordinates */}
                    <div className="mt-4">
                      <Label htmlFor="googleMapsUrl" className="text-sm font-semibold">
                        Google Maps Location Link
                      </Label>
                      <Input
                        id="googleMapsUrl"
                        placeholder="https://maps.google.com/?q=18.5204,73.8567"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div className="mt-3">
                      <MapPickerCard
                        latitude={coords.lat}
                        longitude={coords.lng}
                        onChange={({ lat, lng }) => setCoords({ lat, lng })}
                      />
                    </div>
                  </div>

                  {/* Owner & Description */}
                  <div className="border-t border-border/40 pt-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="builderName" className="text-sm font-semibold">
                          Seller / Owner Name
                        </Label>
                        <Input
                          id="builderName"
                          placeholder="e.g. Rajesh Patil"
                          value={builderName}
                          onChange={(e) => setBuilderName(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="builderNumber" className="text-sm font-semibold">
                          Seller / Contact Phone
                        </Label>
                        <Input
                          id="builderNumber"
                          placeholder="e.g. +91 9876543210"
                          value={builderNumber}
                          onChange={(e) => setBuilderNumber(e.target.value)}
                          className="mt-1.5"
                        />
                        {validationErrors.builderNumber && (
                          <p className="mt-1 text-xs text-destructive">{validationErrors.builderNumber}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="description" className="text-sm font-semibold">
                        Land Description & Features
                      </Label>
                      <Textarea
                        id="description"
                        rows={3}
                        placeholder="e.g. Clear title, demarcation done, barbed wire fencing, 30ft access road, water and electricity connection available nearby."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            ) : (
              /* Condition B: Building / Residential / Commercial Information */
              <SectionCard
                eyebrow="Step 2 of 5"
                title={
                  propertyCategory === "Commercial"
                    ? "Commercial Complex Information"
                    : "Building / Project Information"
                }
                description="Provide project identification, developer details, building dimensions, and multi-tower configuration."
              >
                <div className="space-y-5">
                  {/* Building Name */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="propertyTitle" className="text-sm font-semibold">
                        Project / Building Name <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">{propertyTitle.length}/150</span>
                    </div>
                    <Input
                      id="propertyTitle"
                      placeholder={
                        propertyCategory === "Commercial"
                          ? "e.g. Cyber City Commercial Hub, Apex Business Bay"
                          : "e.g. Sunrise Residency, Grand Heights"
                      }
                      value={propertyTitle}
                      maxLength={150}
                      onChange={(e) => {
                        setPropertyTitle(e.target.value)
                        if (validationErrors.propertyTitle) {
                          setValidationErrors((prev) => {
                            const n = { ...prev }
                            delete n.propertyTitle
                            return n
                          })
                        }
                      }}
                      className={cn("mt-1.5", validationErrors.propertyTitle && "border-destructive")}
                    />
                    {validationErrors.propertyTitle && (
                      <p className="mt-1 text-xs text-destructive">{validationErrors.propertyTitle}</p>
                    )}
                  </div>

                  {/* Subcategory & Status */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="propertySubcategory" className="text-sm font-semibold">
                        Property Subcategory <span className="text-destructive">*</span>
                      </Label>
                      <Select value={propertySubcategory} onValueChange={setPropertySubcategory}>
                        <SelectTrigger id="propertySubcategory" className="mt-1.5">
                          <SelectValue placeholder="Select Subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSubcategoriesFor(propertyCategory).map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="projectStatus" className="text-sm font-semibold">
                        Construction Status
                      </Label>
                      <Select value={projectStatus} onValueChange={setProjectStatus}>
                        <SelectTrigger id="projectStatus" className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ready_to_Move">Ready to Move</SelectItem>
                          <SelectItem value="Under_Construction">Under Construction</SelectItem>
                          <SelectItem value="New_Launch">New Launch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Developer Details */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="builderName" className="text-sm font-semibold">
                        Builder / Developer Name
                      </Label>
                      <Input
                        id="builderName"
                        placeholder="e.g. Godrej Properties, Lodha Group"
                        value={builderName}
                        onChange={(e) => setBuilderName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="builderNumber" className="text-sm font-semibold">
                        Developer Contact Phone
                      </Label>
                      <Input
                        id="builderNumber"
                        placeholder="e.g. +91 9876543210"
                        value={builderNumber}
                        onChange={(e) => setBuilderNumber(e.target.value)}
                        className="mt-1.5"
                      />
                      {validationErrors.builderNumber && (
                        <p className="mt-1 text-xs text-destructive">{validationErrors.builderNumber}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="builderEmail" className="text-sm font-semibold">
                        Developer Email
                      </Label>
                      <Input
                        id="builderEmail"
                        type="email"
                        placeholder="sales@developer.com"
                        value={builderEmail}
                        onChange={(e) => setBuilderEmail(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* ======================================================= */}
                  {/* MULTI-TOWER DECISION SECTION                            */}
                  {/* ======================================================= */}
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          Does this building have multiple towers?
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hasMultipleTowers
                            ? "Configure tower count and distinct tower names. Each tower has its own dedicated floors and units."
                            : "Single building structure. Floors and units will be configured directly under this building."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={!hasMultipleTowers ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHasMultipleTowers(false)}
                          className={cn(!hasMultipleTowers && "bg-primary text-primary-foreground font-semibold")}
                        >
                          No, Single Building
                        </Button>
                        <Button
                          type="button"
                          variant={hasMultipleTowers ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHasMultipleTowers(true)}
                          className={cn(hasMultipleTowers && "bg-primary text-primary-foreground font-semibold")}
                        >
                          Yes, Multiple Towers
                        </Button>
                      </div>
                    </div>

                    {/* Conditional Tower Fields if Yes */}
                    {hasMultipleTowers ? (
                      <div className="mt-4 border-t border-primary/20 pt-4 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-48">
                            <Label htmlFor="towerCount" className="text-xs font-semibold">
                              Number of Towers
                            </Label>
                            <Input
                              id="towerCount"
                              type="number"
                              min={2}
                              max={20}
                              value={towerCount}
                              onChange={(e) => setTowerCount(Math.max(2, Number(e.target.value) || 2))}
                              className="mt-1"
                            />
                          </div>

                          <div className="flex-1">
                            <Label className="text-xs font-semibold">Tower Names</Label>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {towersList.map((tName, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs"
                                >
                                  <input
                                    value={tName}
                                    onChange={(e) => updateTowerName(idx, e.target.value)}
                                    className="bg-transparent font-medium text-foreground outline-none w-24"
                                  />
                                  {towersList.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeTower(idx)}
                                      className="text-muted-foreground hover:text-destructive"
                                      title="Remove tower"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addTower}
                                className="h-7 text-xs gap-1"
                              >
                                <Plus className="h-3 w-3" /> Add Tower
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          Each tower is managed as an independent entity associated with {propertyTitle || "this project"}.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-4">
                        <div className="w-48">
                          <Label htmlFor="totalFloors" className="text-xs font-semibold">
                            Number of Floors
                          </Label>
                          <Input
                            id="totalFloors"
                            type="number"
                            min={1}
                            max={100}
                            value={totalFloors}
                            onChange={(e) => setTotalFloors(Math.max(1, Number(e.target.value) || 1))}
                            className="mt-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          Floors and flats will belong directly to {propertyTitle || "the main building"}.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Areas & Timeline */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="totalLandArea" className="text-sm font-semibold">
                        Total Plot / Land Area
                      </Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="totalLandArea"
                          type="number"
                          placeholder="e.g. 50000"
                          value={totalLandArea}
                          onChange={(e) => setTotalLandArea(e.target.value)}
                          className="flex-1"
                        />
                        <Select value={totalLandAreaUnit} onValueChange={setTotalLandAreaUnit}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sq_ft">Sq. Ft.</SelectItem>
                            <SelectItem value="acres">Acres</SelectItem>
                            <SelectItem value="sq_m">Sq. Mtr.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="totalBuiltUpArea" className="text-sm font-semibold">
                        Total Built-up Area (Sq. Ft.)
                      </Label>
                      <Input
                        id="totalBuiltUpArea"
                        type="number"
                        placeholder="e.g. 120000"
                        value={totalBuiltUpArea}
                        onChange={(e) => setTotalBuiltUpArea(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="possessionDate" className="text-sm font-semibold">
                        Possession Date
                      </Label>
                      <Input
                        id="possessionDate"
                        type="date"
                        value={possessionDate}
                        onChange={(e) => setPossessionDate(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Location & Address */}
                  <div className="border-t border-border/40 pt-4">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      Building Address & Location
                    </h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor="address" className="text-sm font-semibold">
                          Building Street Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="address"
                          placeholder="e.g. Survey No. 45/2, Pancard Club Road, Baner"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value)
                            if (validationErrors.address) {
                              setValidationErrors((prev) => {
                                const n = { ...prev }
                                delete n.address
                                return n
                              })
                            }
                          }}
                          className={cn("mt-1.5", validationErrors.address && "border-destructive")}
                        />
                        {validationErrors.address && (
                          <p className="mt-1 text-xs text-destructive">{validationErrors.address}</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="location-select" className="text-sm font-semibold">
                            Territory / City / Area <span className="text-destructive">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setQuickAddLocationOpen(true)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Quick Add
                          </button>
                        </div>
                        <Select value={selectedLocationId} onValueChange={handleLocationSelect}>
                          <SelectTrigger id="location-select" className="mt-1.5">
                            <SelectValue placeholder="Select city and territory" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.location && (
                          <p className="mt-1 text-xs text-destructive">{validationErrors.location}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="zipCode" className="text-sm font-semibold">
                          Pincode
                        </Label>
                        <Input
                          id="zipCode"
                          placeholder="e.g. 411045"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="googleMapsUrl" className="text-sm font-semibold">
                        Google Maps Location URL
                      </Label>
                      <Input
                        id="googleMapsUrl"
                        placeholder="https://maps.google.com/?q=..."
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>

                    <div className="mt-3">
                      <MapPickerCard
                        latitude={coords.lat}
                        longitude={coords.lng}
                        onChange={({ lat, lng }) => setCoords({ lat, lng })}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="border-t border-border/40 pt-4">
                    <Label htmlFor="description" className="text-sm font-semibold">
                      Building Marketing Description
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder="Comprehensive project overview highlighting premium amenities, connectivity, architectural features, and neighborhood advantages."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevStep} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back to Category
              </Button>
              <Button size="sm" onClick={handleNextStep} className="gap-1.5 glow-primary">
                Continue to Configuration <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </RevealSection>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Conditional Property Configuration                                */}
        {/* ========================================================================= */}
        {activeStep === 3 && (
          <RevealSection>
            {/* Condition 3A: Dedicated Land Configuration */}
            {propertyCategory === "Land" ? (
              <SectionCard
                eyebrow="Step 3 of 5"
                title="Land Parcel Configuration"
                description="Manage individual plot parcels, boundaries, facing, and availability. No towers, floors, or flat configurations."
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Configured Plots ({plots.length})</h4>
                      <p className="text-xs text-muted-foreground">
                        Add individual plots or parcels belonging to this land listing.
                      </p>
                    </div>
                    <Button size="sm" onClick={addPlot} className="gap-1.5 glow-primary">
                      <Plus className="h-3.5 w-3.5" /> Add Plot
                    </Button>
                  </div>

                  {plots.map((plot, idx) => (
                    <div
                      key={plot.id}
                      className="rounded-xl border border-border/70 bg-card/60 p-4 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-sm text-foreground">{plot.plotNumber}</span>
                        </div>
                        {plots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlot(plot.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div>
                          <Label className="text-xs font-semibold">Plot Identifier / Number</Label>
                          <Input
                            value={plot.plotNumber}
                            onChange={(e) => updatePlot(plot.id, { plotNumber: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Area (Sq. Ft.)</Label>
                          <Input
                            type="number"
                            value={plot.area}
                            onChange={(e) => updatePlot(plot.id, { area: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Dimensions</Label>
                          <Input
                            value={plot.dimensions}
                            onChange={(e) => updatePlot(plot.id, { dimensions: e.target.value })}
                            placeholder="e.g. 50x40 ft"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Facing</Label>
                          <Select
                            value={plot.facing}
                            onValueChange={(val) => updatePlot(plot.id, { facing: val })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="East">East</SelectItem>
                              <SelectItem value="West">West</SelectItem>
                              <SelectItem value="North">North</SelectItem>
                              <SelectItem value="South">South</SelectItem>
                              <SelectItem value="North-East">North-East</SelectItem>
                              <SelectItem value="North-West">North-West</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Price (₹)</Label>
                          <Input
                            type="number"
                            value={plot.price}
                            onChange={(e) => updatePlot(plot.id, { price: e.target.value })}
                            placeholder="e.g. 3500000"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Status</Label>
                          <Select
                            value={plot.status}
                            onValueChange={(val: any) => updatePlot(plot.id, { status: val })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="Booked">Booked</SelectItem>
                              <SelectItem value="Sold">Sold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-2">
                          <Label className="text-xs font-semibold">Notes / Highlights</Label>
                          <Input
                            value={plot.notes}
                            onChange={(e) => updatePlot(plot.id, { notes: e.target.value })}
                            placeholder="e.g. Corner plot, 2 sides open, immediate registry"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {validationErrors.plots && (
                    <p className="mt-2 text-xs text-destructive">{validationErrors.plots}</p>
                  )}
                </div>
              </SectionCard>
            ) : hasMultipleTowers ? (
              /* Condition 3B: Buildings With Multiple Towers */
              <SectionCard
                eyebrow="Step 3 of 5"
                title="Multi-Tower Hierarchy & Units"
                description="Select a tower before configuring its floors and units. Every configured unit belongs to the selected tower."
              >
                <div className="space-y-5">
                  {/* Tower Tabs Selector */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/40">
                    <span className="text-xs font-bold text-muted-foreground uppercase mr-2">Select Tower:</span>
                    {towersList.map((tName, idx) => {
                      const isSelected = activeTowerIndex === idx
                      const towerUnitsCount = units.filter((u) => u.towerName === tName).length

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveTowerIndex(idx)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                          )}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{tName}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[10px]",
                              isSelected ? "bg-primary-foreground/20 text-white" : "bg-background/80 text-foreground",
                            )}
                          >
                            {towerUnitsCount} units
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Active Tower Hierarchy Banner */}
                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground">Currently Configuring</div>
                        <div className="text-sm font-bold text-foreground">
                          {propertyTitle || "Building"} → {towersList[activeTowerIndex]}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addUnit(towersList[activeTowerIndex])}
                      className="gap-1.5 glow-primary"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Unit to {towersList[activeTowerIndex]}
                    </Button>
                  </div>

                  {/* Units under active tower */}
                  <div className="space-y-3">
                    {units.filter((u) => u.towerName === towersList[activeTowerIndex]).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center">
                        <Home className="mx-auto h-8 w-8 text-muted-foreground/60" />
                        <h4 className="mt-2 text-sm font-bold text-foreground">No units configured yet</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Add flats, units, or shops belonging specifically to {towersList[activeTowerIndex]}.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addUnit(towersList[activeTowerIndex])}
                          className="mt-3 gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add First Unit
                        </Button>
                      </div>
                    ) : (
                      units
                        .filter((u) => u.towerName === towersList[activeTowerIndex])
                        .map((unit, idx) => (
                          <div
                            key={unit.id}
                            className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                  Floor {unit.floorNumber}
                                </span>
                                <span className="font-semibold text-sm text-foreground">Unit {unit.unitNumber}</span>
                                <span className="text-xs text-muted-foreground">({unit.unitType})</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUnit(unit.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                              <div>
                                <Label className="text-xs font-semibold">Floor No.</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={unit.floorNumber}
                                  onChange={(e) =>
                                    updateUnit(unit.id, { floorNumber: Number(e.target.value) || 0 })
                                  }
                                  className="mt-1"
                                />
                              </div>

                              <div>
                                <Label className="text-xs font-semibold">Unit Number</Label>
                                <Input
                                  value={unit.unitNumber}
                                  onChange={(e) => updateUnit(unit.id, { unitNumber: e.target.value })}
                                  className="mt-1"
                                />
                              </div>

                              <div>
                                <Label className="text-xs font-semibold">Unit Type</Label>
                                <Select
                                  value={unit.unitType}
                                  onValueChange={(val) => updateUnit(unit.id, { unitType: val })}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1 BHK Flat">1 BHK Flat</SelectItem>
                                    <SelectItem value="2 BHK Flat">2 BHK Flat</SelectItem>
                                    <SelectItem value="3 BHK Flat">3 BHK Flat</SelectItem>
                                    <SelectItem value="4 BHK Flat">4 BHK Flat</SelectItem>
                                    <SelectItem value="Studio">Studio</SelectItem>
                                    <SelectItem value="Penthouse">Penthouse</SelectItem>
                                    <SelectItem value="Shop">Shop / Retail</SelectItem>
                                    <SelectItem value="Office">Office Unit</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs font-semibold">Carpet Area (Sq.Ft.)</Label>
                                <Input
                                  type="number"
                                  value={unit.carpetArea}
                                  onChange={(e) => updateUnit(unit.id, { carpetArea: e.target.value })}
                                  className="mt-1"
                                />
                              </div>

                              <div>
                                <Label className="text-xs font-semibold">Status</Label>
                                <Select
                                  value={unit.status}
                                  onValueChange={(val: any) => updateUnit(unit.id, { status: val })}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Booked">Booked</SelectItem>
                                    <SelectItem value="Sold">Sold</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </SectionCard>
            ) : (
              /* Condition 3C: Single Building Configuration */
              <SectionCard
                eyebrow="Step 3 of 5"
                title="Single Building Floor & Unit Configuration"
                description="Configure floors, apartments, and units directly under this building."
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Configured Units ({units.length})</h4>
                      <p className="text-xs text-muted-foreground">
                        Manage flats, shops, or office units for {propertyTitle || "the building"}.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => addUnit()} className="gap-1.5 glow-primary">
                      <Plus className="h-3.5 w-3.5" /> Add Unit
                    </Button>
                  </div>

                  {units.map((unit, idx) => (
                    <div
                      key={unit.id}
                      className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            Floor {unit.floorNumber}
                          </span>
                          <span className="font-semibold text-sm text-foreground">Unit {unit.unitNumber}</span>
                          <span className="text-xs text-muted-foreground">({unit.unitType})</span>
                        </div>
                        {units.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUnit(unit.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                        <div>
                          <Label className="text-xs font-semibold">Floor No.</Label>
                          <Input
                            type="number"
                            min={0}
                            value={unit.floorNumber}
                            onChange={(e) => updateUnit(unit.id, { floorNumber: Number(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Unit Number</Label>
                          <Input
                            value={unit.unitNumber}
                            onChange={(e) => updateUnit(unit.id, { unitNumber: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Unit Type</Label>
                          <Select
                            value={unit.unitType}
                            onValueChange={(val) => updateUnit(unit.id, { unitType: val })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1 BHK Flat">1 BHK Flat</SelectItem>
                              <SelectItem value="2 BHK Flat">2 BHK Flat</SelectItem>
                              <SelectItem value="3 BHK Flat">3 BHK Flat</SelectItem>
                              <SelectItem value="4 BHK Flat">4 BHK Flat</SelectItem>
                              <SelectItem value="Studio">Studio</SelectItem>
                              <SelectItem value="Shop">Shop / Retail</SelectItem>
                              <SelectItem value="Office">Office</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Carpet Area (Sq.Ft.)</Label>
                          <Input
                            type="number"
                            value={unit.carpetArea}
                            onChange={(e) => updateUnit(unit.id, { carpetArea: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Status</Label>
                          <Select
                            value={unit.status}
                            onValueChange={(val: any) => updateUnit(unit.id, { status: val })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="Booked">Booked</SelectItem>
                              <SelectItem value="Sold">Sold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevStep} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back to Information
              </Button>
              <Button size="sm" onClick={handleNextStep} className="gap-1.5 glow-primary">
                Continue to Documents <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </RevealSection>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Property-Type-Specific Documents & Media                          */}
        {/* ========================================================================= */}
        {activeStep === 4 && (
          <RevealSection>
            <SectionCard
              eyebrow="Step 4 of 5"
              title={
                propertyCategory === "Land"
                  ? "Land Legal Documents & Media"
                  : "Building Approvals & Media"
              }
              description={
                propertyCategory === "Land"
                  ? "Upload title deeds, 7/12 extract, survey plans, and plot photographs."
                  : "Upload sanctioned blueprints, CC/OC approvals, tower documents, and building photos."
              }
            >
              <div className="space-y-6">
                {/* Cover Image Upload */}
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    {propertyCategory === "Land" ? "Plot / Land Cover Image" : "Building Cover Photo"}
                  </h4>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex h-36 w-full sm:w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/80 bg-muted/30">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : existingCoverUrl ? (
                        <img src={existingCoverUrl} alt="Existing" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-center p-3 text-muted-foreground">
                          <ImageIcon className="mx-auto h-8 w-8 mb-1 opacity-50" />
                          <span className="text-xs">No cover image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <Label htmlFor="cover-upload" className="cursor-pointer">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/60 transition-all">
                          <Upload className="h-4 w-4 text-primary" />
                          Choose Cover Image
                        </div>
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setCoverFile(file)
                          }}
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Recommended format: JPG, PNG, or WebP. Optimal resolution: 1920x1080.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Property Type Specific Documents Vault */}
                <div className="border-t border-border/40 pt-5">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                    <FolderArchive className="h-4 w-4 text-primary" />
                    {propertyCategory === "Land" ? "Land Documents Checklist" : "Project Compliance Documents"}
                  </h4>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {propertyCategory === "Land" ? (
                      <>
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">7/12 Extract (Saat Bara)</div>
                            <div className="text-[11px] text-muted-foreground">Land revenue record</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "7_12_EXTRACT", "PROPERTY")}
                            />
                          </Label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Sale Deed / Title Deed</div>
                            <div className="text-[11px] text-muted-foreground">Ownership proof</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "SALE_DEED", "PROPERTY")}
                            />
                          </Label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Property Card (Akhiv Patrika)</div>
                            <div className="text-[11px] text-muted-foreground">City survey record</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "PROPERTY_CARD", "PROPERTY")}
                            />
                          </Label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">NA Sanction Order</div>
                            <div className="text-[11px] text-muted-foreground">Non-agricultural layout approval</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "NA_ORDER", "PROPERTY")}
                            />
                          </Label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Sanctioned Building Plan</div>
                            <div className="text-[11px] text-muted-foreground">Architectural approval</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "SANCTIONED_PLAN", "BUILDING")}
                            />
                          </Label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Commencement Certificate (CC)</div>
                            <div className="text-[11px] text-muted-foreground">Construction sanction</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "COMMENCEMENT_CERT", "BUILDING")}
                            />
                          </Label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Occupancy Certificate (OC)</div>
                            <div className="text-[11px] text-muted-foreground">Completion clearance</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "OCCUPANCY_CERT", "BUILDING")}
                            />
                          </Label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Fire & Environmental NOC</div>
                            <div className="text-[11px] text-muted-foreground">Safety clearance</div>
                          </div>
                          <Label className="cursor-pointer">
                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              Upload
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(e.target.files, "FIRE_NOC", "BUILDING")}
                            />
                          </Label>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Uploaded Documents List */}
                  {uploadedDocs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-bold text-foreground">Queued for Upload ({uploadedDocs.length})</div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {uploadedDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-lg border border-border/80 bg-background/80 p-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{doc.name}</div>
                                <div className="text-[10px] text-muted-foreground">{doc.category.replace(/_/g, " ")}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDoc(doc.id)}
                              className="text-muted-foreground hover:text-destructive p-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevStep} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back to Configuration
              </Button>
              <Button size="sm" onClick={handleNextStep} className="gap-1.5 glow-primary">
                Review Property <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </RevealSection>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: Review and Create Property                                        */}
        {/* ========================================================================= */}
        {activeStep === 5 && (
          <RevealSection>
            <SectionCard
              eyebrow="Step 5 of 5"
              title="Review & Confirm Property Details"
              description="Verify all configured property data before saving to the database."
            >
              <div className="space-y-6">
                {/* Header Summary */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {propertyCategory === "Land" ? "Land / Plot" : propertyCategory}
                        </span>
                        <span className="text-xs text-muted-foreground">• {propertySubcategory}</span>
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-foreground">
                        {propertyTitle.trim() ||
                          (propertyCategory === "Land"
                            ? plotNumber
                              ? `Plot ${plotNumber}`
                              : `Land Parcel at ${area || city || "Location"}`
                            : "Unnamed Property")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        {address ? `${address}, ${area ? `${area}, ` : ""}${city}` : "Address pending"}
                      </p>
                    </div>

                    <div className="text-right sm:text-right">
                      <div className="text-xs text-muted-foreground">Asking Price</div>
                      <div className="text-lg font-extrabold text-foreground">
                        {price ? `₹ ${Number(price).toLocaleString("en-IN")}` : "Price on Request"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Hierarchy Breakdown */}
                {propertyCategory === "Land" ? (
                  <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Land Specifications & Plots ({plots.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Plot Number:</span>
                        <div className="font-semibold text-foreground">{plotNumber || "Not specified"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Survey / Gut No:</span>
                        <div className="font-semibold text-foreground">{surveyNumber || "Not specified"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Land Area:</span>
                        <div className="font-semibold text-foreground">
                          {totalLandArea ? `${totalLandArea} ${totalLandAreaUnit}` : "Not specified"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ownership:</span>
                        <div className="font-semibold text-foreground">{ownershipType}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Structure & Hierarchy
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Hierarchy Mode:</span>
                        <div className="font-semibold text-foreground">
                          {hasMultipleTowers ? `${towersList.length} Towers` : "Single Building"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Configured Units:</span>
                        <div className="font-semibold text-foreground">{units.length} Units</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="font-semibold text-foreground">{projectStatus.replace(/_/g, " ")}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Developer:</span>
                        <div className="font-semibold text-foreground">{builderName || "Not specified"}</div>
                      </div>
                    </div>

                    {hasMultipleTowers && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
                        {towersList.map((tName, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {tName} ({units.filter((u) => u.towerName === tName).length} units)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Media & Docs Summary */}
                <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <FolderArchive className="h-4 w-4 text-primary" />
                    Media & Documents Summary
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div>Cover Photo: {coverFile ? "Selected (Ready to upload)" : existingCoverUrl ? "Existing" : "None"}</div>
                    <div>•</div>
                    <div>Compliance Documents: {uploadedDocs.length} queued for upload</div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevStep} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back to Documents
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProperty}
                disabled={saveState === "saving"}
                className="gap-1.5 glow-primary"
              >
                {saveState === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Property...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {propertyCategory === "Land"
                      ? "Create Land Listing"
                      : hasMultipleTowers
                      ? "Create Multi-Tower Project"
                      : "Create Building & Units"}
                  </>
                )}
              </Button>
            </div>
          </RevealSection>
        )}
      </div>

      {/* Discard Confirmation Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Discard Unsaved Changes?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Any entered property details, plot configurations, or uploaded documents will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDiscardDialogOpen(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDiscardDialogOpen(false)
                navigate(`/${role}/properties`)
              }}
            >
              Discard & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Location Dialog */}
      <Dialog open={quickAddLocationOpen} onOpenChange={setQuickAddLocationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Location</DialogTitle>
            <DialogDescription>
              Add a new city and territory to your property management system.
            </DialogDescription>
          </DialogHeader>

          {quickLocationError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              {quickLocationError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="quick-state" className="text-xs font-semibold">
                State
              </Label>
              <Select
                value={quickLocationForm.state}
                onValueChange={(val) => setQuickLocationForm((prev) => ({ ...prev, state: val }))}
              >
                <SelectTrigger id="quick-state" className="mt-1">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {indianStates.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quick-city" className="text-xs font-semibold">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-city"
                value={quickLocationForm.city}
                onChange={(e) => setQuickLocationForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. Pune, Mumbai, Bangalore"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="quick-area" className="text-xs font-semibold">
                Area / Locality <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-area"
                value={quickLocationForm.area}
                onChange={(e) => setQuickLocationForm((prev) => ({ ...prev, area: e.target.value }))}
                placeholder="e.g. Baner, Wakad, Whitefield"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickAddLocationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleQuickAddLocation}
            >
              Add & Select Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
