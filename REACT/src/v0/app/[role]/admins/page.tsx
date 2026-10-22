// @ts-nocheck
"use client"

import { useRef, useState, useCallback, forwardRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus, Search, Eye, Trash2, ShieldCheck, Mail, Phone, FileText, X,
  Camera, Upload, User2, Briefcase, Lock, CheckCircle2, AlertCircle,
  Building2, IdCard, EyeOff, Loader2, UserPlus, Shield
} from "lucide-react"
import { useParams } from "react-router-dom"
import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import { PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUsersData } from "@/lib/live-data"
import { cn } from "@/lib/utils"
import { AnimatedRows, PanelTransition, RevealSection } from "@/motion"
import { Logomark } from "@/components/brand/logo"

// ─── Types & Constants ────────────────────────────────────────────────────────

type Tab = "admins" | "subadmins" | "employees" | "self"
type CreateRole = "Admin" | "SubAdmin" | "Employee"

const panPattern = /^[A-Z]{3}[PCHFTGA][A-Z][0-9]{4}[A-Z]$/

const emptyCreateForm = {
  name: "", email: "", phone: "", gender: "", dob: "",
  department: "", designation: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  employmentType: "Full-time",
  panNumber: "", aadhaarNumber: "",
  panDocument: null as File | null,
  aadhaarDocument: null as File | null,
  password: "", confirmPassword: "",
  subscriptionType: "FULL",
  assignedState: "", assignedCity: "", assignedArea: "", subscriptionRate: "",
  photoFile: null as File | null,
  photoPreviewUrl: "",
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function passwordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "" }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: "Weak",   color: "bg-red-500" }
  if (s <= 3) return { score: s, label: "Fair",   color: "bg-amber-400" }
  if (s <= 4) return { score: s, label: "Good",   color: "bg-blue-500" }
  return        { score: s, label: "Strong", color: "bg-emerald-500" }
}

function normalizedAadhaar(v: string) { return (v || "").replace(/\D/g, "").slice(0, 12) }
function formatAadhaarInput(v: string) { return normalizedAadhaar(v).replace(/(\d{4})(?=\d)/g, "$1 ").trim() }

function canSubmitCreate(role: CreateRole, form: typeof emptyCreateForm) {
  const minPw = 8
  if (!form.name.trim() || !form.email.trim()) return false
  if (form.password.length < minPw || form.password !== form.confirmPassword) return false
  if (role === "Admin") return true
  if (!panPattern.test((form.panNumber || "").trim().toUpperCase())) return false
  if (!/^[0-9]{12}$/.test(normalizedAadhaar(form.aadhaarNumber))) return false
  if (role === "SubAdmin" && form.subscriptionType === "LOCATION_BASED")
    return !!(form.assignedState.trim() && form.assignedCity.trim() && form.subscriptionRate.trim())
  return true
}

function getMissingFields(role: CreateRole, form: typeof emptyCreateForm): string[] {
  const m: string[] = []
  const minPw = 8
  if (!form.name.trim()) m.push("Full name")
  if (!form.email.trim()) m.push("Email address")
  if (form.password.length < minPw) m.push(`Password (min ${minPw} chars)`)
  else if (form.password !== form.confirmPassword) m.push("Passwords must match")
  if (role !== "Admin") {
    if (!panPattern.test((form.panNumber || "").trim().toUpperCase())) m.push("Valid PAN (e.g. ABCDE1234F)")
    if (!/^[0-9]{12}$/.test(normalizedAadhaar(form.aadhaarNumber))) m.push("12-digit Aadhaar number")
  }
  if (role === "SubAdmin" && form.subscriptionType === "LOCATION_BASED") {
    if (!form.assignedState.trim())    m.push("Assigned state")
    if (!form.assignedCity.trim())     m.push("Assigned city")
    if (!form.subscriptionRate.trim()) m.push("Subscription rate")
  }
  return m
}

function buildPayload(role: CreateRole, form: typeof emptyCreateForm) {
  const base: Record<string, unknown> = { name: form.name.trim(), email: form.email.trim(), password: form.password }
  if (form.phone.trim()) base.phone = form.phone.trim()
  if (role !== "Admin") {
    base.panNumber    = (form.panNumber || "").trim().toUpperCase()
    base.aadhaarNumber = normalizedAadhaar(form.aadhaarNumber)
  }
  if (role === "SubAdmin") {
    base.subscriptionType = form.subscriptionType === "LOCATION_BASED" ? "location_based" : "full"
    base.paymentMethod = "MANUAL"; base.signupSource = "MANUAL"
    if (form.subscriptionType === "LOCATION_BASED") {
      base.assignedState = form.assignedState.trim()
      base.assignedCity  = form.assignedCity.trim()
      if (form.assignedArea.trim()) base.assignedArea = form.assignedArea.trim()
      base.subscriptionRate = Number(form.subscriptionRate)
    }
  }
  return base
}

async function uploadKycFiles(userId: string | number, form: typeof emptyCreateForm) {
  if (form.panDocument)     await estateApi.kyc.uploadUser(userId, "PAN_CARD",     form.panDocument)
  if (form.aadhaarDocument) await estateApi.kyc.uploadUser(userId, "AADHAAR_CARD", form.aadhaarDocument)
}

function createdUserId(r: unknown): string | number | undefined {
  if (!r || typeof r !== "object") return undefined
  const o = r as Record<string, unknown>
  return (o.id ?? o.userId ?? (o.profile as Record<string, unknown>)?.id) as string | number | undefined
}

const ROLE_CFG = {
  Admin:    { color: "text-violet-600 dark:text-violet-400",    bg: "bg-violet-50 dark:bg-violet-950/30",   prefix: "ADM", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",   icon: Shield    },
  SubAdmin: { color: "text-blue-600 dark:text-blue-400",        bg: "bg-blue-50 dark:bg-blue-950/30",       prefix: "SUB", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",           icon: ShieldCheck },
  Employee: { color: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-50 dark:bg-emerald-950/30", prefix: "EMP", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: User2    },
} as const

// ─── Small shared components ──────────────────────────────────────────────────

const DocUploadButton = forwardRef<
  HTMLInputElement,
  { file: File | null; id: string; label: string; onChange: (f: File | null) => void }
>(function DocUploadButton({ file, id, label, onChange }, ref) {
  return (
    <label htmlFor={id} className={cn(
      "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors select-none",
      file
        ? "border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
        : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
    )}>
      {file ? <CheckCircle2 className="size-4 shrink-0" /> : <Upload className="size-4 shrink-0" />}
      <span className="flex-1 truncate">{file ? file.name : label}</span>
      {file && (
        <button type="button" className="shrink-0 hover:text-destructive"
          onClick={(e) => { e.preventDefault(); onChange(null) }}>
          <X className="size-3.5" />
        </button>
      )}
      <input ref={ref} id={id} type="file" className="sr-only"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  )
})

function FormSection({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  )
}

function FormField({ label, required = false, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {label}{required && <span className="text-primary/70">*</span>}
      </Label>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

// ─── ID Card Preview ──────────────────────────────────────────────────────────

function IdCardPreview({ form, role, cfg }: {
  form: typeof emptyCreateForm
  role: CreateRole
  cfg: typeof ROLE_CFG[CreateRole] | null
}) {
  const RoleIcon  = cfg?.icon ?? User2
  const dispName  = form.name.trim()  || "Full Name"
  const dispDesg  = form.designation.trim() || "Designation"
  const dispDept  = form.department.trim()  || "Department"
  const dispId    = (cfg?.prefix ?? "ID") + "-XXX"

  return (
    <div className="w-full max-w-[220px] rounded-2xl overflow-hidden shadow-xl border border-border/40 select-none">
      {/* Dark header */}
      <div className="px-4 pt-5 pb-10 relative bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Logomark className="size-5" />
          <div>
            <p className="text-[9px] font-bold text-white tracking-wide">RealEstate</p>
            <p className="text-[7px] text-[#c9a84c] font-medium tracking-[0.15em] uppercase">— Guide —</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", cfg?.badge)}>
          <RoleIcon className="size-2.5" />{role === "SubAdmin" ? "Sub Admin" : role}
        </span>
        <p className="absolute bottom-3 right-3 text-[9px] font-mono text-white/30">{dispId}</p>
      </div>

      {/* Info body */}
      <div className="bg-card px-4 pb-5">
        <div className="relative -mt-8 mb-3 mx-auto w-fit">
          <div className="size-16 rounded-xl overflow-hidden border-2 border-background shadow-lg bg-muted">
            {form.photoPreviewUrl ? (
              <img src={form.photoPreviewUrl} alt={dispName} className="w-full h-full object-cover" />
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center text-xl font-bold", cfg?.color, cfg?.bg)}>
                {form.name.trim() ? form.name.trim().charAt(0).toUpperCase() : <User2 className="size-7 text-muted-foreground" />}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm font-bold text-center leading-tight truncate">{dispName}</p>
        <p className={cn("text-[11px] text-center font-medium mt-0.5 truncate", cfg?.color)}>{dispDesg}</p>
        <p className="text-[10px] text-center text-muted-foreground mt-0.5 truncate">{dispDept}</p>
        <div className="mt-3 border-t border-border/60 pt-3 space-y-1.5">
          {form.email.trim() && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Mail className="size-2.5 shrink-0" /><span className="truncate">{form.email.trim()}</span>
            </div>
          )}
          {form.phone.trim() && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Phone className="size-2.5 shrink-0" /><span>{form.phone.trim()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Building2 className="size-2.5 shrink-0" /><span>Joined {form.joiningDate || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminsPage() {
  const { role = "superadmin" } = useParams()
  const isSuper = role === "superadmin"
  const [tab, setTab] = useState<Tab>("admins")
  const [query, setQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<null | Record<string, unknown>>(null)
  const [createRole, setCreateRole] = useState<CreateRole | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [warnValidation, setWarnValidation] = useState(false)
  const photoRef    = useRef<HTMLInputElement>(null)
  const panDocRef   = useRef<HTMLInputElement>(null)
  const aadhaarRef  = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { admins, subAdmins, employees } = useUsersData()

  const tabList = [
    { id: "admins",    label: "Admins",                count: admins.length },
    { id: "subadmins", label: "Sub Admins",             count: subAdmins.length },
    { id: "employees", label: "Employees",              count: employees.length },
    { id: "self",      label: "Self Signed Sub Admins", count: 0 },
  ]

  const tableData =
    tab === "admins"    ? admins    :
    tab === "subadmins" ? subAdmins :
    tab === "employees" ? employees : []

  const filtered = tableData.filter((u) =>
    `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(query.toLowerCase())
  )

  // Mutations
  const kycMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      estateApi.users.superadmin.patchKyc(id, { kycStatus: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["v0", "users"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (user: Record<string, unknown>) => {
      if (user.role === "Admin")    return estateApi.users.superadmin.deleteAdmin(user.id as string)
      if (user.role === "Employee") return estateApi.users.superadmin.deleteEmployee(user.id as string)
      return estateApi.users.superadmin.deleteSubadmin(user.id as string)
    },
    onSuccess: () => { setSelectedUser(null); queryClient.invalidateQueries({ queryKey: ["v0", "users"] }) },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createRole) throw new Error("Select a role")
      if (createRole === "Admin" && !isSuper) throw new Error("Only a Super Admin can create Admins")
      const payload = buildPayload(createRole, createForm)
      const created =
        createRole === "Admin"    ? await estateApi.users.superadmin.createAdmin(payload)
        : createRole === "SubAdmin" ? await (isSuper ? estateApi.users.superadmin.createSubadmin : estateApi.users.admin.createSubadmin)(payload)
        : await (isSuper ? estateApi.users.superadmin.createEmployee : estateApi.users.admin.createEmployee)(payload)

      const uid = createdUserId(created)
      if (createRole !== "Admin" && uid) await uploadKycFiles(uid, createForm)
      if (createForm.photoFile && uid) {
        try { await estateApi.users.uploadProfilePhoto(uid, createForm.photoFile) } catch { /* non-critical */ }
      }
      return created
    },
    onSuccess: () => {
      closeDrawer()
      queryClient.invalidateQueries({ queryKey: ["v0", "users"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })

  // Derived state
  const canSubmit     = createRole ? canSubmitCreate(createRole, createForm) : false
  const missingFields = createRole ? getMissingFields(createRole, createForm) : []
  const cfg           = createRole ? ROLE_CFG[createRole] : null
  const RoleIcon      = cfg?.icon ?? UserPlus
  const pwStr         = passwordStrength(createForm.password)

  // Handlers
  function openDrawer(r: CreateRole) {
    setCreateRole(r)
    setCreateForm(emptyCreateForm)
    setShowPw(false); setShowConfirmPw(false); setWarnValidation(false)
  }
  function closeDrawer() {
    setCreateRole(null); setCreateForm(emptyCreateForm)
    createMutation.reset(); setWarnValidation(false)
  }
  function setVal(key: string, val: string) {
    setCreateForm((f) => ({ ...f, [key]: val }))
    setWarnValidation(false)
  }
  function setFile(key: string, file: File | null) {
    setCreateForm((f) => ({ ...f, [key]: file }))
    setWarnValidation(false)
  }

  const onPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setCreateForm((f) => ({ ...f, photoFile: file, photoPreviewUrl: URL.createObjectURL(file) }))
  }, [])

  const removePhoto = useCallback(() => {
    if (createForm.photoPreviewUrl) URL.revokeObjectURL(createForm.photoPreviewUrl)
    setCreateForm((f) => ({ ...f, photoFile: null, photoPreviewUrl: "" }))
    if (photoRef.current) photoRef.current.value = ""
  }, [createForm.photoPreviewUrl])

  function handleCreate() {
    if (!canSubmit) { setWarnValidation(true); return }
    createMutation.mutate()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="reference-page-panel mx-auto my-5 w-[calc(100%-64px)] max-w-[1560px] space-y-6 px-10 py-10">
      <PageHeader
        eyebrow="Directory"
        title="User Management"
        description="Create and manage admins, sub admins, and employees with full KYC verification."
        actions={
          <div className="flex flex-wrap gap-2">
            {isSuper && (
              <Button variant="outline" className="gap-2 active:scale-[0.98]" onClick={() => openDrawer("Admin")}>
                <Plus className="size-4" /> Add Admin
              </Button>
            )}
            <Button variant="outline" className="gap-2 active:scale-[0.98]" onClick={() => openDrawer("SubAdmin")}>
              <Plus className="size-4" /> Add Sub Admin
            </Button>
            <Button className="gap-2 active:scale-[0.98]" onClick={() => openDrawer("Employee")}>
              <Plus className="size-4" /> Add Employee
            </Button>
          </div>
        }
      />

      {/* Table card */}
      <RevealSection>
        <SectionCard eyebrow="Directory" title="Users">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-border/60">
            {tabList.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id as Tab)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium transition-colors active:scale-[0.98]",
                  tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                {t.label} <span className="text-xs tabular-nums">({t.count})</span>
                {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, phone…" className="h-11 pl-9" />
            </div>
            <span className="rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
              {filtered.length} records
            </span>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead>
                  <TableHead>City</TableHead><TableHead>KYC</TableHead><TableHead>Active</TableHead>
                  <TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">No users yet.</TableCell></TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="size-3.5" /><span className="max-w-[180px] truncate">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Phone className="size-3.5" />{u.phone}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.city}</TableCell>
                    <TableCell>
                      <StatusPill tone={u.kyc === "verified" ? "success" : "warning"}>
                        {u.kyc === "verified" ? "Verified" : "Pending"}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={u.active ? "success" : "neutral"}>
                        {u.active ? "Active" : "Inactive"}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <ShieldCheck className="size-3.5 text-primary" />{u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-8" onClick={() => setSelectedUser(u)}>
                          <Eye className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u) }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </RevealSection>

      {/* ── User Detail Panel ─────────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/70 backdrop-blur-sm">
          <PanelTransition motionKey={String(selectedUser.id)} className="h-full w-full max-w-xl">
            <aside className="surface-elevated border-border h-full w-full max-w-xl overflow-y-auto border-l p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{String(selectedUser.role)} detail</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{String(selectedUser.name)}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusPill tone={selectedUser.kyc === "verified" ? "success" : "warning"} dot>
                      KYC {selectedUser.kyc === "verified" ? "Verified" : "Pending"}
                    </StatusPill>
                    <StatusPill tone={selectedUser.active ? "success" : "neutral"}>
                      {selectedUser.active ? "Active" : "Inactive"}
                    </StatusPill>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedUser(null)}><X className="size-4" /></Button>
              </div>
              <div className="mt-6 grid gap-4">
                <DetailRow label="Email" value={String(selectedUser.email || "—")} />
                <DetailRow label="Phone" value={String(selectedUser.phone || "—")} />
                <DetailRow label="City"  value={String(selectedUser.city  || "—")} />
              </div>
              <SectionCard className="mt-6" eyebrow="KYC" title="Documents and verification">
                <AnimatedRows className="grid gap-3">
                  {["Aadhaar card", "PAN card", "Profile photo"].map((doc) => (
                    <div key={doc} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-sm"><FileText className="size-4 text-primary" />{doc}</span>
                      <Button size="sm" variant="secondary">View</Button>
                    </div>
                  ))}
                </AnimatedRows>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" disabled={kycMutation.isPending}
                    onClick={() => kycMutation.mutate({ id: String(selectedUser.id), status: "VERIFIED" })}>
                    Approve KYC
                  </Button>
                  <Button size="sm" variant="secondary" disabled={kycMutation.isPending}
                    onClick={() => kycMutation.mutate({ id: String(selectedUser.id), status: "REJECTED" })}>
                    Reject KYC
                  </Button>
                </div>
              </SectionCard>
            </aside>
          </PanelTransition>
        </div>
      )}

      {/* ── Create ID Drawer ──────────────────────────────────────────── */}
      {createRole && (
        <div className="fixed inset-0 z-50 flex items-stretch bg-background/70 backdrop-blur-sm">
          {/* Click-away backdrop */}
          <div className="flex-1" onClick={closeDrawer} />

          <PanelTransition motionKey={createRole} className="flex h-full flex-col" style={{ width: "min(960px,95vw)" }}>
            <div className="flex h-full flex-col overflow-hidden rounded-l-2xl border border-r-0 border-border/80 bg-background shadow-2xl">

              {/* Header */}
              <div className={cn("flex items-center justify-between gap-4 px-6 py-4 border-b border-border/60 shrink-0", cfg?.bg)}>
                <div className="flex items-center gap-3">
                  <div className={cn("grid size-9 place-items-center rounded-xl bg-background/60 shadow-sm", cfg?.color)}>
                    <RoleIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Create New</p>
                    <h2 className="text-lg font-semibold leading-tight">{createRole === "SubAdmin" ? "Sub Admin" : createRole} ID</h2>
                  </div>
                </div>
                <button onClick={closeDrawer}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Scrollable form */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                  {/* §1 Profile */}
                  <FormSection icon={<User2 className="size-4" />} title="Profile Information" subtitle="Name, contact and personal details">
                    <div className="flex gap-5 flex-wrap">
                      {/* Photo */}
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div
                          className={cn(
                            "relative group size-24 rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 overflow-hidden cursor-pointer transition-all hover:border-primary/60 hover:bg-muted/50",
                            createForm.photoPreviewUrl && "border-solid border-primary/40"
                          )}
                          onClick={() => photoRef.current?.click()}
                          title="Upload profile photo">
                          {createForm.photoPreviewUrl ? (
                            <img src={createForm.photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                              <Camera className="size-6" />
                              <span className="text-[10px] text-center px-1">Upload Photo</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="size-5 text-white" />
                          </div>
                        </div>
                        {createForm.photoPreviewUrl
                          ? <button type="button" onClick={removePhoto} className="text-[11px] text-destructive hover:underline">Remove</button>
                          : <span className="text-[11px] text-muted-foreground text-center leading-tight">JPG · PNG · WebP<br />Max 10 MB</span>
                        }
                        <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPhotoChange} />
                      </div>

                      {/* Basic fields */}
                      <div className="flex-1 grid gap-3 sm:grid-cols-2 min-w-0">
                        <FormField label="Full Name" required>
                          <Input id="create-name" placeholder="e.g. Rahul Sharma"
                            value={createForm.name} onChange={(e) => setVal("name", e.target.value)} />
                        </FormField>
                        <FormField label="Email Address" required>
                          <Input id="create-email" type="email" placeholder="rahul@company.in"
                            value={createForm.email} onChange={(e) => setVal("email", e.target.value)} />
                        </FormField>
                        <FormField label="Mobile Number">
                          <Input id="create-phone" placeholder="+91 98765 43210"
                            value={createForm.phone} onChange={(e) => setVal("phone", e.target.value)} />
                        </FormField>
                        <FormField label="Gender">
                          <Select value={createForm.gender} onValueChange={(v) => setVal("gender", v)}>
                            <SelectTrigger id="create-gender" className="h-10 w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Date of Birth">
                          <Input id="create-dob" type="date" value={createForm.dob}
                            onChange={(e) => setVal("dob", e.target.value)} />
                        </FormField>
                      </div>
                    </div>
                  </FormSection>

                  {/* §2 Professional */}
                  <FormSection icon={<Briefcase className="size-4" />} title="Professional Details" subtitle="Role, department and employment info">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Role">
                        <div className={cn("h-10 flex items-center px-3 rounded-lg border border-border/60 text-sm font-medium gap-2", cfg?.color, cfg?.bg)}>
                          <RoleIcon className="size-3.5 shrink-0" />
                          <span>{createRole === "SubAdmin" ? "Sub Admin" : createRole}</span>
                          <span className="ml-auto text-xs font-mono text-muted-foreground">{cfg?.prefix}-XXX</span>
                        </div>
                      </FormField>
                      <FormField label="Department">
                        <Input id="create-dept" placeholder="e.g. Sales, Operations"
                          value={createForm.department} onChange={(e) => setVal("department", e.target.value)} />
                      </FormField>
                      <FormField label="Designation">
                        <Input id="create-desg" placeholder="e.g. Sales Executive"
                          value={createForm.designation} onChange={(e) => setVal("designation", e.target.value)} />
                      </FormField>
                      <FormField label="Joining Date">
                        <Input id="create-joining" type="date" value={createForm.joiningDate}
                          onChange={(e) => setVal("joiningDate", e.target.value)} />
                      </FormField>
                      <FormField label="Employment Type">
                        <Select value={createForm.employmentType} onValueChange={(v) => setVal("employmentType", v)}>
                          <SelectTrigger id="create-emp-type" className="h-10 w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    {/* SubAdmin subscription sub-section */}
                    {createRole === "SubAdmin" && (
                      <div className="mt-4 rounded-xl border border-blue-200/60 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/10 p-4 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Subscription Settings</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField label="Subscription Type">
                            <Select value={createForm.subscriptionType} onValueChange={(v) => setVal("subscriptionType", v)}>
                              <SelectTrigger id="create-sub-type" className="h-10 w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FULL">Full Access (All India)</SelectItem>
                                <SelectItem value="LOCATION_BASED">Location Based</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormField>
                          {createForm.subscriptionType === "LOCATION_BASED" && (<>
                            <FormField label="Assigned State" required>
                              <Input placeholder="Maharashtra" value={createForm.assignedState} onChange={(e) => setVal("assignedState", e.target.value)} />
                            </FormField>
                            <FormField label="Assigned City" required>
                              <Input placeholder="Pune" value={createForm.assignedCity} onChange={(e) => setVal("assignedCity", e.target.value)} />
                            </FormField>
                            <FormField label="Area (optional)">
                              <Input placeholder="Baramati" value={createForm.assignedArea} onChange={(e) => setVal("assignedArea", e.target.value)} />
                            </FormField>
                            <FormField label="Rate (₹ / month)" required>
                              <Input type="number" placeholder="5000" value={createForm.subscriptionRate} onChange={(e) => setVal("subscriptionRate", e.target.value)} />
                            </FormField>
                          </>)}
                        </div>
                      </div>
                    )}
                  </FormSection>

                  {/* §3 KYC (not for Admin) */}
                  {createRole !== "Admin" && (
                    <FormSection icon={<IdCard className="size-4" />} title="KYC & Identity Documents" subtitle="Required for account verification">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="PAN Number" required>
                          <Input id="create-pan" placeholder="ABCDE1234F" maxLength={10}
                            className={cn("font-mono uppercase tracking-widest",
                              createForm.panNumber && !panPattern.test(createForm.panNumber.toUpperCase()) && "border-destructive/60")}
                            value={createForm.panNumber}
                            onChange={(e) => setVal("panNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} />
                          {createForm.panNumber && !panPattern.test(createForm.panNumber.toUpperCase()) && (
                            <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="size-3" /> Format: ABCDE1234F
                            </p>
                          )}
                        </FormField>
                        <FormField label="PAN Document (Optional)">
                          <DocUploadButton ref={panDocRef} file={createForm.panDocument}
                            id="create-pan-doc" label="Upload PAN (PDF / Image)"
                            onChange={(f) => setFile("panDocument", f)} />
                        </FormField>
                        <FormField label="Aadhaar Number" required>
                          <Input id="create-aadhaar" placeholder="1234 5678 9012"
                            className={cn("font-mono tracking-widest",
                              createForm.aadhaarNumber && normalizedAadhaar(createForm.aadhaarNumber).length !== 12 && "border-destructive/60")}
                            value={createForm.aadhaarNumber}
                            onChange={(e) => setVal("aadhaarNumber", formatAadhaarInput(e.target.value))} />
                          {createForm.aadhaarNumber && normalizedAadhaar(createForm.aadhaarNumber).length !== 12 && (
                            <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="size-3" /> Must be exactly 12 digits
                            </p>
                          )}
                        </FormField>
                        <FormField label="Aadhaar Document (Optional)">
                          <DocUploadButton ref={aadhaarRef} file={createForm.aadhaarDocument}
                            id="create-aadhaar-doc" label="Upload Aadhaar (PDF / Image)"
                            onChange={(f) => setFile("aadhaarDocument", f)} />
                        </FormField>
                      </div>
                    </FormSection>
                  )}

                  {/* §4 Account Security */}
                  <FormSection icon={<Lock className="size-4" />} title="Account Security"
                    subtitle="Password must be at least 8 characters">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Password" required>
                        <div className="relative">
                          <Input id="create-password"
                            type={showPw ? "text" : "password"}
                            placeholder="Min 8 characters"
                            className="pr-10"
                            value={createForm.password}
                            onChange={(e) => setVal("password", e.target.value)} />
                          <button type="button" tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPw((v) => !v)}>
                            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        {createForm.password && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-300", pwStr.color)}
                                style={{ width: `${(pwStr.score / 5) * 100}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground w-12">{pwStr.label}</span>
                          </div>
                        )}
                      </FormField>
                      <FormField label="Confirm Password" required>
                        <div className="relative">
                          <Input id="create-confirm-pw"
                            type={showConfirmPw ? "text" : "password"}
                            placeholder="Re-enter password"
                            className={cn("pr-10",
                              createForm.confirmPassword && createForm.password !== createForm.confirmPassword && "border-destructive/60")}
                            value={createForm.confirmPassword}
                            onChange={(e) => setVal("confirmPassword", e.target.value)} />
                          <button type="button" tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPw((v) => !v)}>
                            {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        {createForm.confirmPassword && createForm.password !== createForm.confirmPassword && (
                          <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="size-3" /> Passwords do not match
                          </p>
                        )}
                        {createForm.confirmPassword && createForm.password === createForm.confirmPassword && createForm.password && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Passwords match
                          </p>
                        )}
                      </FormField>
                    </div>
                  </FormSection>

                  {/* API error */}
                  {createMutation.isError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="size-4 mt-0.5 shrink-0" />
                      {createMutation.error instanceof Error ? createMutation.error.message : "Could not create user."}
                    </div>
                  )}

                  {/* Validation warning */}
                  {warnValidation && missingFields.length > 0 && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
                      <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                        <AlertCircle className="size-4" /> Please complete these fields:
                      </p>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                        {missingFields.map((f) => <li key={f}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Live ID Preview (desktop) */}
                <div className="hidden lg:flex w-[268px] shrink-0 flex-col border-l border-border/60 bg-muted/10">
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Live ID Preview</p>
                  </div>
                  <div className="flex-1 overflow-y-auto flex items-start justify-center p-5 pt-8">
                    <IdCardPreview form={createForm} role={createRole} cfg={cfg} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border/60 px-6 py-4 flex items-center justify-between gap-4 bg-background/80 shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {canSubmit
                    ? <><CheckCircle2 className="size-3.5 text-emerald-500" /> Ready to create</>
                    : <><AlertCircle className="size-3.5 text-amber-500" /> {missingFields.length} field{missingFields.length !== 1 ? "s" : ""} needed</>
                  }
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={closeDrawer}>Cancel</Button>
                  <Button id="create-user-submit-btn" type="button"
                    disabled={createMutation.isPending}
                    onClick={handleCreate}
                    className={cn(
                      "gap-2 min-w-[170px] font-semibold transition-all duration-200",
                      canSubmit
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/40 hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]"
                        : "opacity-75 hover:opacity-90 cursor-pointer"
                    )}>
                    {createMutation.isPending
                      ? <><Loader2 className="size-4 animate-spin" /> Creating…</>
                      : <><UserPlus className="size-4" /> Create {createRole === "SubAdmin" ? "Sub Admin" : createRole}</>
                    }
                  </Button>
                </div>
              </div>

            </div>
          </PanelTransition>
        </div>
      )}
    </div>
  )
}
