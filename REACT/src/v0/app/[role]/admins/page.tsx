// @ts-nocheck
"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, Eye, Trash2, ShieldCheck, Mail, Phone, FileText, X } from "lucide-react"
import { useParams } from "react-router-dom"
import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import { PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useUsersData } from "@/lib/live-data"
import { cn } from "@/lib/utils"
import { AnimatedRows, PanelTransition, RevealSection } from "@/motion"

type Tab = "admins" | "subadmins" | "employees" | "self"
type CreateRole = "Admin" | "SubAdmin" | "Employee"

const emptyCreateForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  panNumber: "",
  aadhaarNumber: "",
  panDocument: null,
  aadhaarDocument: null,
  subscriptionType: "FULL",
  assignedState: "",
  assignedCity: "",
  assignedArea: "",
  subscriptionRate: "",
}

const panPattern = /^[A-Z]{3}[PCHFTGA][A-Z][0-9]{4}[A-Z]$/

export default function AdminsPage() {
  const { role = "superadmin" } = useParams()
  const isSuper = role === "superadmin"
  const [tab, setTab] = useState<Tab>("admins")
  const [query, setQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [createRole, setCreateRole] = useState<CreateRole | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const queryClient = useQueryClient()
  const { admins, subAdmins, employees } = useUsersData()
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "admins", label: "Admins", count: admins.length },
    { id: "subadmins", label: "Sub Admins", count: subAdmins.length },
    { id: "employees", label: "Employees", count: employees.length },
    { id: "self", label: "Self Signed Sub Admins", count: 0 },
  ]

  const data =
    tab === "admins"
      ? admins
      : tab === "subadmins"
        ? subAdmins
        : tab === "employees"
          ? employees
          : []

  const filtered = data.filter((u) =>
    `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(query.toLowerCase()),
  )

  const kycMutation = useMutation({
    mutationFn: ({ id, status }) => estateApi.users.superadmin.patchKyc(id, { kycStatus: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["v0", "users"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (user) => {
      if (user.role === "Admin") return estateApi.users.superadmin.deleteAdmin(user.id)
      if (user.role === "Employee") return estateApi.users.superadmin.deleteEmployee(user.id)
      return estateApi.users.superadmin.deleteSubadmin(user.id)
    },
    onSuccess: () => {
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ["v0", "users"] })
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createRole) throw new Error("Select a user type.")
      if (createRole === "Admin" && !isSuper) throw new Error("Only a super admin can add admins.")
      const payload = createPayload(createRole, createForm)
      const created =
        createRole === "Admin"
          ? await estateApi.users.superadmin.createAdmin(payload)
          : createRole === "SubAdmin"
            ? await (isSuper ? estateApi.users.superadmin.createSubadmin : estateApi.users.admin.createSubadmin)(payload)
            : await (isSuper ? estateApi.users.superadmin.createEmployee : estateApi.users.admin.createEmployee)(payload)
      if (createRole !== "Admin") {
        const userId = createdUserId(created)
        if (!userId) throw new Error("User was created but the backend did not return an id for KYC upload.")
        await uploadKycFiles(userId, createForm)
      }
      return created
    },
    onSuccess: () => {
      closeCreateDialog()
      queryClient.invalidateQueries({ queryKey: ["v0", "users"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })

  const createDisabled = !createRole || createMutation.isPending || !canSubmitCreate(createRole, createForm)

  function openCreateDialog(nextRole: CreateRole) {
    setCreateRole(nextRole)
    setCreateForm(emptyCreateForm)
  }

  function closeCreateDialog() {
    setCreateRole(null)
    setCreateForm(emptyCreateForm)
    createMutation.reset()
  }

  function setCreateValue(key: string, value: string) {
    setCreateForm((current) => ({ ...current, [key]: value }))
  }

  function setCreateFile(key: string, file: File | null) {
    setCreateForm((current) => ({ ...current, [key]: file }))
  }

  return (
    <div className="reference-page-panel mx-auto my-5 w-[calc(100%-64px)] max-w-[1560px] space-y-6 px-10 py-10">
      <PageHeader
        eyebrow="Directory"
        title="User Management"
        description="Manage admins, sub admins, employees, KYC, and access state."
        actions={
          <div className="flex flex-wrap gap-2">
            {isSuper ? (
            <Button variant="outline" className="transition-transform active:scale-[0.98]" onClick={() => openCreateDialog("Admin")}>
              <Plus className="size-4" />
              Add Admin
            </Button>
            ) : null}
            <Button variant="outline" className="transition-transform active:scale-[0.98]" onClick={() => openCreateDialog("SubAdmin")}>
              <Plus className="size-4" />
              Add Sub Admin
            </Button>
            <Button className="transition-transform active:scale-[0.98]" onClick={() => openCreateDialog("Employee")}>
              <Plus className="size-4" />
              Add Employee
            </Button>
          </div>
        }
      />

      <RevealSection>
      <SectionCard eyebrow="Directory" title="Users">
        <div className="flex flex-wrap gap-1 border-b border-border/60">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-[color,transform,opacity] active:scale-[0.98]",
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="text-xs tabular-nums">({t.count})</span>
              {tab === t.id ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="h-11 pl-9"
            />
          </div>
          <span className="rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
            {filtered.length} records
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                    No users in this category yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
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
                        <Mail className="size-3.5" />
                        <span className="max-w-[180px] truncate">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5" />
                        {u.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.city}</TableCell>
                    <TableCell>
                      <StatusPill tone={u.kyc === "Verified" ? "success" : "warning"}>
                        {u.kyc}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={u.active ? "success" : "neutral"}>
                        {u.active ? "Active" : "Inactive"}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <ShieldCheck className="size-3.5 text-primary" />
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`View ${u.name} details`}
                          onClick={() => setSelectedUser(u)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          aria-label={`Delete ${u.name}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
      </RevealSection>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/70 backdrop-blur-sm">
          <PanelTransition motionKey={selectedUser.id} className="h-full w-full max-w-xl">
          <aside className="surface-elevated border-border h-full w-full max-w-xl overflow-y-auto border-l p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                  {selectedUser.role} detail
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{selectedUser.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill tone={selectedUser.kyc === "Verified" ? "success" : "warning"} dot>
                    KYC {selectedUser.kyc}
                  </StatusPill>
                  <StatusPill tone={selectedUser.active ? "success" : "neutral"}>
                    {selectedUser.active ? "Active" : "Inactive"}
                  </StatusPill>
                </div>
              </div>
              <Button size="icon" variant="ghost" aria-label="Close user detail" onClick={() => setSelectedUser(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-6 grid gap-4">
              <DetailRow label="Email" value={selectedUser.email} />
              <DetailRow label="Phone" value={selectedUser.phone} />
              <DetailRow label="City" value={selectedUser.city || "-"} />
              <DetailRow label="Aadhaar number" value={selectedUser.aadhaarNumber || "Pending"} mono />
              <DetailRow label="PAN number" value={selectedUser.panNumber || "Pending"} mono />
              <DetailRow label="Plan" value={selectedUser.planType || "Not assigned"} />
              <DetailRow label="Subscription amount" value={selectedUser.amountPaid || "Payment pending"} mono />
            </div>

            <SectionCard className="mt-6" eyebrow="KYC" title="Documents and verification">
              <div className="grid gap-3">
                <AnimatedRows className="grid gap-3">
                {["Aadhaar card", "PAN card", "Profile photo"].map((doc) => (
                  <div key={doc} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <FileText className="size-4 text-primary" />
                      {doc}
                    </span>
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  </div>
                ))}
                </AnimatedRows>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={kycMutation.isPending}
                  onClick={() => kycMutation.mutate({ id: selectedUser.id, status: "VERIFIED" })}
                >
                  Approve KYC
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={kycMutation.isPending}
                  onClick={() => kycMutation.mutate({ id: selectedUser.id, status: "REJECTED" })}
                >
                  Reject KYC
                </Button>
              </div>
            </SectionCard>

            <SectionCard className="mt-6" eyebrow="Payments" title="Payment history">
              <div className="divide-border divide-y rounded-lg border border-border/70">
                <AnimatedRows>
                {["Initial subscription", "Renewal"].map((label, index) => (
                  <div key={label} className="flex items-center justify-between px-3 py-3 text-sm">
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-muted-foreground text-xs">{index === 0 ? "Created with account" : "No renewal recorded"}</div>
                    </div>
                    <StatusPill tone={index === 0 && selectedUser.active ? "success" : "neutral"}>
                      {index === 0 && selectedUser.active ? "Paid" : "Pending"}
                    </StatusPill>
                  </div>
                ))}
                </AnimatedRows>
              </div>
            </SectionCard>
          </aside>
          </PanelTransition>
        </div>
      ) : null}
      <Dialog open={Boolean(createRole)} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add {createRole === "SubAdmin" ? "Sub Admin" : createRole}</DialogTitle>
            <DialogDescription>
              {createRole === "Admin"
                ? "Create an admin account with backend authentication."
                : "Create the account and upload PAN and Aadhaar documents."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input value={createForm.name} onChange={(event) => setCreateValue("name", event.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={createForm.email} onChange={(event) => setCreateValue("email", event.target.value)} />
              </Field>
              <Field label="Phone (optional)">
                <Input value={createForm.phone} onChange={(event) => setCreateValue("phone", event.target.value)} />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateValue("password", event.target.value)}
                  placeholder={createRole === "Employee" ? "At least 12 characters" : "At least 8 characters"}
                />
              </Field>
            </div>

            {createRole === "SubAdmin" ? (
              <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-2">
                <Field label="Subscription">
                  <Select value={createForm.subscriptionType} onValueChange={(value) => setCreateValue("subscriptionType", value)}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">Full access</SelectItem>
                      <SelectItem value="LOCATION_BASED">Location based</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {createForm.subscriptionType === "LOCATION_BASED" ? (
                  <>
                    <Field label="State">
                      <Input value={createForm.assignedState} onChange={(event) => setCreateValue("assignedState", event.target.value)} />
                    </Field>
                    <Field label="City">
                      <Input value={createForm.assignedCity} onChange={(event) => setCreateValue("assignedCity", event.target.value)} />
                    </Field>
                    <Field label="Area (optional)">
                      <Input value={createForm.assignedArea} onChange={(event) => setCreateValue("assignedArea", event.target.value)} />
                    </Field>
                    <Field label="Rate">
                      <Input type="number" value={createForm.subscriptionRate} onChange={(event) => setCreateValue("subscriptionRate", event.target.value)} />
                    </Field>
                  </>
                ) : null}
              </div>
            ) : null}

            {createRole !== "Admin" ? (
              <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-2">
                <Field label="PAN number">
                  <Input
                    value={createForm.panNumber}
                    onChange={(event) => setCreateValue("panNumber", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                    placeholder="ABCDE1234F"
                  />
                </Field>
                <Field label="PAN document">
                  <Input type="file" accept="image/*,application/pdf" onChange={(event) => setCreateFile("panDocument", event.target.files?.[0] ?? null)} />
                </Field>
                <Field label="Aadhaar number">
                  <Input
                    value={createForm.aadhaarNumber}
                    onChange={(event) => setCreateValue("aadhaarNumber", formatAadhaarInput(event.target.value))}
                    placeholder="1234 5678 9012"
                  />
                </Field>
                <Field label="Aadhaar document">
                  <Input type="file" accept="image/*,application/pdf" onChange={(event) => setCreateFile("aadhaarDocument", event.target.files?.[0] ?? null)} />
                </Field>
              </div>
            ) : null}

            {createMutation.isError ? (
              <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createMutation.error instanceof Error ? createMutation.error.message : "Could not create user."}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={closeCreateDialog}>Cancel</Button>
            <Button type="button" disabled={createDisabled} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Creating..." : `Create ${createRole === "SubAdmin" ? "Sub Admin" : createRole}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono text-xs tabular-nums")}>{value}</span>
    </div>
  )
}

function canSubmitCreate(role: CreateRole, form) {
  const passwordLength = role === "Employee" ? 12 : 8
  if (!form.name.trim() || !form.email.trim() || form.password.length < passwordLength) return false
  if (role === "Admin") return true
  if (!panPattern.test(form.panNumber.trim().toUpperCase())) return false
  if (!/^[0-9]{12}$/.test(normalizedAadhaar(form.aadhaarNumber))) return false
  if (!form.panDocument || !form.aadhaarDocument) return false
  if (role === "SubAdmin" && form.subscriptionType === "LOCATION_BASED") {
    return Boolean(form.assignedState.trim() && form.assignedCity.trim() && form.subscriptionRate.trim())
  }
  return true
}

function createPayload(role: CreateRole, form) {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
  }
  if (form.phone.trim()) payload.phone = form.phone.trim()
  if (role !== "Admin") {
    payload.panNumber = form.panNumber.trim().toUpperCase()
    payload.aadhaarNumber = normalizedAadhaar(form.aadhaarNumber)
  }
  if (role === "SubAdmin") {
    payload.subscriptionType = form.subscriptionType
    payload.paymentMethod = "MANUAL"
    payload.signupSource = "MANUAL"
    if (form.subscriptionType === "LOCATION_BASED") {
      payload.assignedState = form.assignedState.trim()
      payload.assignedCity = form.assignedCity.trim()
      payload.assignedArea = form.assignedArea.trim() || undefined
      payload.subscriptionRate = Number(form.subscriptionRate)
    }
  }
  return payload
}

async function uploadKycFiles(userId, form) {
  await estateApi.kyc.uploadUser(userId, "PAN_CARD", form.panDocument)
  await estateApi.kyc.uploadUser(userId, "AADHAAR_CARD", form.aadhaarDocument)
}

function createdUserId(created) {
  if (!created || typeof created !== "object") return undefined
  return created.id ?? created.userId ?? created.profile?.id
}

function normalizedAadhaar(value: string) {
  return value.replace(/\D/g, "").slice(0, 12)
}

function formatAadhaarInput(value: string) {
  return normalizedAadhaar(value).replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}
