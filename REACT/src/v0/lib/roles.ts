import { Crown, Users, Building2, UserCog, type LucideIcon } from "lucide-react"

export type RoleKey = "superadmin" | "admin" | "subadmin" | "employee"

export type RoleDef = {
  key: RoleKey
  label: string
  short: string
  description: string
  icon: LucideIcon
  /** Tailwind utility-friendly accent color name (mapped in CSS) */
  accent: string
}

export const ROLES: Record<RoleKey, RoleDef> = {
  superadmin: {
    key: "superadmin",
    label: "Super Admin",
    short: "Owner",
    description:
      "Global control across properties, admins, sub admins, employees, CRM, sales, analytics, locations, map, and chat.",
    icon: Crown,
    accent: "primary",
  },
  admin: {
    key: "admin",
    label: "Admin",
    short: "Workspace",
    description:
      "Workspace lead for assigned sub admins, employees, properties, CRM, sales, analytics, map, and chat.",
    icon: Users,
    accent: "info",
  },
  subadmin: {
    key: "subadmin",
    label: "Sub Admin",
    short: "Operator",
    description:
      "Subscription-backed operator with property upload, CRM, sales, analytics, chat — scoped to assigned locations.",
    icon: Building2,
    accent: "warning",
  },
  employee: {
    key: "employee",
    label: "Employee",
    short: "Field",
    description:
      "Execution workspace for assigned leads, follow-ups, property search, sales support, map, and chat.",
    icon: UserCog,
    accent: "success",
  },
}

export const ROLE_ORDER: RoleKey[] = ["superadmin", "admin", "subadmin", "employee"]
