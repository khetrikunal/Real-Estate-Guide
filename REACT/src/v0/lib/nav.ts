import {
  CalendarClock,
  Building2,
  Search,
  Receipt,
  ShieldCheck,
  MapPinned,
  Contact2,
  BarChart3,
  Map,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react"
import type { RoleKey } from "./roles"

export type NavItem = {
  key: string
  label: string
  href: (role: RoleKey) => string
  icon: LucideIcon
  badge?: string
}

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Primary",
    items: [
      {
        key: "followup",
        label: "Follow-up",
        icon: CalendarClock,
        href: (r) => `/${r}/followup`,
      },
      {
        key: "properties",
        label: "Add Property",
        icon: Building2,
        href: (r) => `/${r}/properties`,
      },
      {
        key: "search",
        label: "Search Property",
        icon: Search,
        href: (r) => `/${r}/search-property`,
      },
      {
        key: "sales",
        label: "Sales",
        icon: Receipt,
        href: (r) => `/${r}/sales`,
      },
      {
        key: "admins",
        label: "Admins",
        icon: ShieldCheck,
        href: (r) => `/${r}/admins`,
      },
      {
        key: "locations",
        label: "Add Location",
        icon: MapPinned,
        href: (r) => `/${r}/locations`,
      },
      {
        key: "crm",
        label: "CRM",
        icon: Contact2,
        href: (r) => `/${r}/crm`,
      },
      {
        key: "analytics",
        label: "Analytics",
        icon: BarChart3,
        href: (r) => `/${r}/analytics`,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        key: "map",
        label: "Map",
        icon: Map,
        href: (r) => `/${r}/map`,
      },
      {
        key: "chat",
        label: "Chat",
        icon: MessagesSquare,
        href: (r) => `/${r}/chat`,
      },
    ],
  },
]

const roleNavAccess: Record<RoleKey, ReadonlySet<string>> = {
  superadmin: new Set(["followup", "properties", "search", "sales", "admins", "locations", "crm", "analytics", "map", "chat"]),
  admin: new Set(["followup", "properties", "search", "sales", "admins", "crm", "analytics", "map", "chat"]),
  subadmin: new Set(["followup", "properties", "search", "sales", "locations", "crm", "analytics", "map", "chat"]),
  employee: new Set(["followup", "properties", "search", "sales", "locations", "crm", "analytics", "map", "chat"]),
}

export function navSectionsForRole(role: RoleKey): NavSection[] {
  const allowed = roleNavAccess[role]
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.has(item.key)),
    }))
    .filter((section) => section.items.length > 0)
}
