// Mock domain data used across pages — kept centralized so screens stay consistent.

export type PropertyStatus = "active" | "pending" | "draft"

export type Property = {
  id: string
  name: string
  address?: string
  city: string
  state?: string
  area?: string
  config: string
  configTypes?: string[]
  listingTypes?: string[]
  price: string // formatted with INR
  priceValue: number
  status: PropertyStatus
  unitsTotal: number
  unitsSold: number
  completion?: number
  pincode?: string
  cover?: string
  latitude?: number
  longitude?: number
  googleMapsUrl?: string
  noImage?: boolean
  isDeleted?: boolean
  deletedAt?: string
  raw?: Record<string, unknown>
}

export const PROPERTIES: Property[] = [
  {
    id: "smoke-fix",
    name: "Smoke Project Fix 1776971085165",
    city: "Baramati",
    area: "MIDC",
    config: "3 BHK",
    price: "INR 12,33,321",
    priceValue: 1233321,
    status: "active",
    unitsTotal: 1,
    unitsSold: 0,
  },
  {
    id: "new-propert",
    name: "new propert",
    city: "Pune",
    config: "2 BHK",
    price: "INR 15,006",
    priceValue: 15006,
    status: "active",
    unitsTotal: 1,
    unitsSold: 0,
    noImage: true,
  },
  {
    id: "hotel",
    name: "hotel",
    city: "Pune",
    config: "2 BHK",
    price: "INR 1,00,000",
    priceValue: 100000,
    status: "active",
    unitsTotal: 10,
    unitsSold: 0,
  },
  {
    id: "smoke-786",
    name: "Smoke Project 1776970786925",
    city: "Baramati",
    area: "Centre",
    config: "Configuration pending",
    price: "Price pending",
    priceValue: 0,
    status: "pending",
    unitsTotal: 0,
    unitsSold: 0,
  },
]

export type Lead = {
  id: string
  customer: string
  customerName?: string
  phone: string
  email: string
  city: string
  status: "new" | "interested" | "contacted" | "pending" | "site_visit" | "negotiation" | "won" | "lost"
  assigned: string | null
  assignedEmployeeName?: string
  project?: string
  projectName?: string
  projectId?: number | string
  configId?: number | string
  propertyInterest?: string
  projectInterest?: string
  createdAt: string
  raw?: Record<string, unknown>
}

export type FollowUpItem = {
  id: string
  leadId: string
  customer: string
  when: string
  scheduledAt: string
  status: "scheduled" | "completed" | "overdue"
  description: string
  owner: string
  initials: string
  raw?: Record<string, unknown>
}

export const LEADS: Lead[] = [
  {
    id: "1",
    customer: "SHERRY",
    phone: "198283718",
    email: "sherry@gmail.com",
    city: "—",
    status: "new",
    assigned: null,
    createdAt: "29 Apr 2026",
  },
  {
    id: "2",
    customer: "Kunal",
    phone: "9370465576",
    email: "khetrikunal05@gm…",
    city: "—",
    status: "new",
    assigned: null,
    createdAt: "30 Apr 2026",
  },
]

export type SaleRecord = {
  id: string
  projectId?: string
  configurationId?: string
  unitId?: string
  project: string
  config: string
  propertyType?: string
  listingType?: string
  unitLabel?: string
  unitNo?: string
  floorNo?: string
  carpetAreaSqft?: number
  saleableAreaSqft?: number
  ratePerSqft?: number
  parkingAvailable?: boolean
  parkingCost?: number
  completionPercentage?: number
  units: number
  amount: string
  buyer: string | null
  buyerPhone?: string
  buyerEmail?: string
  notes?: string
  date: string
  by: string
  raw?: Record<string, unknown>
}

export const SALES: SaleRecord[] = [
  {
    id: "1",
    project: "hotel",
    config: "2 BHK",
    units: 5,
    amount: "INR 5,00,000",
    buyer: null,
    date: "24 Apr 2026",
    by: "Super Admin",
  },
]

export type AdminUser = {
  id: string
  name: string
  email: string
  phone: string
  city: string
  kyc: "pending" | "verified"
  active: boolean
  role: "Admin" | "Sub Admin" | "Employee"
  initials: string
}

export const ADMINS: AdminUser[] = [
  {
    id: "1",
    name: "Smoke Admin 1776",
    email: "admin.smoke.17…",
    phone: "9999999999",
    city: "—",
    kyc: "pending",
    active: true,
    role: "Admin",
    initials: "SA",
  },
  {
    id: "2",
    name: "vegeta",
    email: "vegeta@gmail.com",
    phone: "1284726171",
    city: "—",
    kyc: "pending",
    active: true,
    role: "Admin",
    initials: "VG",
  },
  {
    id: "3",
    name: "Admin User",
    email: "admin@sherry.io",
    phone: "—",
    city: "—",
    kyc: "pending",
    active: true,
    role: "Admin",
    initials: "AU",
  },
  {
    id: "4",
    name: "Smoke Admin 1779",
    email: "smoke.admin.17…",
    phone: "9999999999",
    city: "—",
    kyc: "pending",
    active: true,
    role: "Admin",
    initials: "SA",
  },
]

export type Location = {
  id: string
  name: string
  city: string
  state: string
  area: string
  rate: string
}

export const LOCATIONS: Location[] = [
  { id: "1", name: "MIDC", city: "Baramati", state: "Maharashtra", area: "MIDC", rate: "₹6,000/mo" },
  {
    id: "2",
    name: "Smoke Location 17769…",
    city: "Baramati",
    state: "Maharashtra",
    area: "Centre",
    rate: "₹1/mo",
  },
]

export const AREAS = [{ id: "1", name: "MIDC", city: "Baramati", state: "Maharashtra" }]

export type Conversation = {
  id: string
  name: string
  role: string
  lastMessage: string
  time: string
  unread?: number
  online?: boolean
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: "admin-user",
    name: "Admin User",
    role: "Admin",
    lastMessage: "hi",
    time: "May 1, 04:49 PM",
    online: false,
  },
]

export const leads = LEADS
export const admins = ADMINS.filter((user) => user.role === "Admin")
export const subAdmins = ADMINS.filter((user) => user.role === "Sub Admin")
export const employees = ADMINS.filter((user) => user.role === "Employee")
export const locations = LOCATIONS
export const areas = AREAS
