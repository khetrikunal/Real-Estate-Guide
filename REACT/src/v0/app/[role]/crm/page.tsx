// @ts-nocheck
"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Search,
  Trash2,
  Users,
  Target,
  TrendingUp,
  PhoneCall,
  Calendar,
  ArrowUpDown,
} from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatCard } from "@/components/shell/stat-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import { useAuth } from "@app/auth/AuthContext"
import { useLeadsData } from "@/lib/live-data"
import { cn } from "@/lib/utils"
import { OperationalKpiGroup, PanelTransition, RevealSection } from "@app/motion"

const emptyLeadForm = {
  name: "",
  phone: "",
  email: "",
  propertySearch: "",
  projectId: "",
  configId: "",
}

const emptyFollowUpForm = {
  scheduledAt: "",
  description: "",
}

export default function CrmPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"all" | "followups">("all")
  const [query, setQuery] = useState("")
  const [range, setRange] = useState<"7d" | "30d" | "default">("default")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [leadForm, setLeadForm] = useState(emptyLeadForm)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm)
  const { leads } = useLeadsData()

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: estateApi.projects.list,
  })
  const followUpsQuery = useQuery({
    queryKey: queryKeys.followUps.dashboard(fromDate || undefined, toDate || undefined),
    queryFn: () => estateApi.followUps.dashboardWindow({ from: fromDate || undefined, to: toDate || undefined }),
  })
  const pendingCountQuery = useQuery({
    queryKey: queryKeys.followUps.pendingCount(),
    queryFn: estateApi.followUps.pendingCount,
  })

  const projects = useMemo(() => asArray(projectsQuery.data), [projectsQuery.data])
  const selectedProject = projects.find((project) => String(projectIdOf(project)) === leadForm.projectId)
  const selectedProjectName = selectedProject ? projectNameOf(selectedProject) : ""
  const configs = selectedProject ? projectConfigsOf(selectedProject) : []
  const selectedConfig = configs.find((config) => String(configIdOf(config)) === leadForm.configId)
  const selectedConfigLabel = selectedConfig ? configLabelOf(selectedConfig) : ""
  const propertyInterest = [selectedProjectName, selectedConfigLabel].filter(Boolean).join(" - ")
  const followUpItems = useMemo(() => followUpItemsOf(followUpsQuery.data), [followUpsQuery.data])
  const followUpLeadIds = useMemo(
    () => new Set(followUpItems.map((item) => stringValue(firstValue(item, ["leadId", "lead_id"]))).filter(Boolean)),
    [followUpItems],
  )

  const filteredProjects = useMemo(() => {
    const search = leadForm.propertySearch.trim().toLowerCase()
    if (!search) return projects
    return projects.filter((project) =>
      `${projectNameOf(project)} ${stringValue(project.city)} ${stringValue(project.area)}`
        .toLowerCase()
        .includes(search),
    )
  }, [leadForm.propertySearch, projects])

  const createLead = useMutation({
    mutationFn: () =>
      estateApi.leads.create({
        customerName: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        ...(leadForm.email.trim() ? { email: leadForm.email.trim() } : {}),
        projectId: numericOrString(leadForm.projectId),
        configId: numericOrString(leadForm.configId),
        propertyInterest,
      }),
    onSuccess: () => {
      invalidateLeads(queryClient)
      setShowCreate(false)
      setLeadForm(emptyLeadForm)
    },
  })

  const deleteLead = useMutation({
    mutationFn: (id: string | number) => estateApi.leads.remove(id),
    onSuccess: (_, id) => {
      invalidateLeads(queryClient)
      if (selectedLeadId === String(id)) {
        setSelectedLeadId(null)
        setShowFollowUp(false)
        setFollowUpForm(emptyFollowUpForm)
      }
    },
  })

  const createFollowUp = useMutation({
    mutationFn: () => {
      if (!selectedLead) throw new Error("Lead required")
      const ownerUserId = ownerUserIdForLead(selectedLead, auth.user)
      if (ownerUserId == null) throw new Error("Owner required")
      return estateApi.followUps.create(selectedLead.id, {
        ownerUserId,
        callingType: "FOLLOW_UP",
        scheduledAt: formatLocalDateTime(followUpForm.scheduledAt),
        description: followUpForm.description.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all })
      queryClient.invalidateQueries({ queryKey: ["v0", "follow-ups"] })
      invalidateLeads(queryClient)
      setShowFollowUp(false)
      setFollowUpForm(emptyFollowUpForm)
    },
  })

  const searchedLeads = leads.filter((l) =>
    `${l.customer} ${l.customerName} ${l.email} ${l.phone} ${l.projectName} ${l.propertyInterest}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const followUpLeads = searchedLeads.filter((lead) => isFollowUpLead(lead, followUpLeadIds))
  const filtered = tab === "followups" ? followUpLeads : searchedLeads
  const selectedLead = selectedLeadId ? leads.find((lead) => String(lead.id) === selectedLeadId) ?? null : null
  const selectedOwnerUserId = selectedLead ? ownerUserIdForLead(selectedLead, auth.user) : null

  const totalLeads = leads.length
  const newLeads = leads.filter((l) => normalizeStatus(l.status) === "new").length
  const interested = leads.filter((l) => normalizeStatus(l.status) === "interested").length
  const pendingToday = pendingTodayCount(pendingCountQuery.data, followUpsQuery.data, followUpItems)
  const createDisabled =
    createLead.isPending ||
    !leadForm.name.trim() ||
    !leadForm.phone.trim() ||
    !selectedProject ||
    !selectedConfig
  const followUpDisabled =
    createFollowUp.isPending || !selectedLead || selectedOwnerUserId == null || !followUpForm.scheduledAt

  return (
    <div className="reference-page-panel mx-auto my-5 w-[calc(100%-64px)] max-w-[1560px] space-y-6 px-10 py-10">
      <PageHeader
        eyebrow="CRM"
        title="Lead Management"
        description="Track new leads, follow-ups, and pipeline health across the team."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            New Lead
          </Button>
        }
      />

      <OperationalKpiGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={totalLeads} icon={Users} hint="All time" tone="primary" />
        <StatCard label="New" value={newLeads} icon={Target} hint="Awaiting first contact" tone="success" />
        <StatCard label="Interested" value={interested} icon={TrendingUp} hint="In discussion" tone="warning" />
        <StatCard label="Pending today" value={pendingToday} icon={PhoneCall} hint="Scheduled calls" tone="danger" />
      </OperationalKpiGroup>

      <RevealSection>
      <SectionCard eyebrow="Follow-up window" title="Default window">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">From</label>
            <Input
              aria-label="From date"
              type="date"
              className="mt-1.5 h-11"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">To</label>
            <Input
              aria-label="To date"
              type="date"
              className="mt-1.5 h-11"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            {(["7d", "30d", "default"] as const).map((r) => (
              <Button
                key={r}
                variant={range === r ? "default" : "outline"}
                onClick={() => {
                  setRange(r)
                  setDateRange(r, setFromDate, setToDate)
                }}
                className="h-11"
              >
                {r === "default" ? (
                  <Calendar className="size-4" />
                ) : null}
                {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "Default"}
              </Button>
            ))}
          </div>
        </div>
      </SectionCard>
      </RevealSection>

      <div>
        <div className="flex items-end gap-1 border-b border-border/60" role="tablist" aria-label="CRM lead views">
          {(["all", "followups"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All Leads" : "Follow-ups"}{" "}
              <span className="text-xs tabular-nums">
                ({t === "all" ? searchedLeads.length : followUpLeads.length})
              </span>
              {tab === t ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard eyebrow="All leads" title="Leads">
          <div className="flex items-center gap-3">
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
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Customer <ArrowUpDown className="size-3" />
                    </span>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow
                    key={l.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedLeadId(String(l.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedLeadId(String(l.id))
                      }
                    }}
                    className={cn(
                      "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selectedLeadId === String(l.id) ? "bg-primary/10 hover:bg-primary/15" : undefined,
                    )}
                  >
                    <TableCell className="font-medium">{leadName(l)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">{l.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{l.email}</TableCell>
                    <TableCell className="text-muted-foreground">{l.city}</TableCell>
                    <TableCell>
                      <StatusPill tone={statusTone(l.status)}>{l.status}</StatusPill>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.assigned}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label={`Delete lead ${leadName(l)}`}
                        disabled={deleteLead.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteLead.mutate(l.id)
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Selected lead" title={selectedLead ? leadName(selectedLead) : "Details"}>
          <PanelTransition motionKey={selectedLead ? String(selectedLead.id) : "empty-lead"}>
          {selectedLead ? (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <DetailRow label="Name" value={leadName(selectedLead)} />
                <DetailRow label="Phone" value={selectedLead.phone} mono />
                <DetailRow label="Email" value={selectedLead.email} />
                <DetailRow label="City" value={selectedLead.city} />
                <DetailRow label="Interest" value={selectedLead.propertyInterest ?? selectedLead.projectInterest ?? selectedLead.project} />
                <DetailRow label="Project" value={selectedLead.projectName} />
                <DetailRow label="Project ID" value={selectedLead.projectId} mono />
                <DetailRow label="Config ID" value={selectedLead.configId} mono />
                <DetailRow label="Assigned" value={selectedLead.assigned ?? selectedLead.assignedEmployeeName} />
                <DetailRow label="Status" value={selectedLead.status} />
              </div>

              <Button className="w-full" variant="outline" onClick={() => setShowFollowUp((value) => !value)}>
                <PhoneCall className="size-4" />
                Follow up
              </Button>

              {showFollowUp ? (
                <PanelTransition motionKey={`${selectedLead.id}-follow-up`}>
                <form
                  className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    createFollowUp.mutate()
                  }}
                >
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Date & time
                    </label>
                    <Input
                      aria-label="Follow-up date and time"
                      type="datetime-local"
                      className="mt-1.5 h-11"
                      value={followUpForm.scheduledAt}
                      onChange={(event) => setFollowUpForm((form) => ({ ...form, scheduledAt: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Notes
                    </label>
                    <Textarea
                      aria-label="Follow-up notes"
                      className="mt-1.5 min-h-20"
                      value={followUpForm.description}
                      onChange={(event) => setFollowUpForm((form) => ({ ...form, description: event.target.value }))}
                    />
                  </div>
                  <Button className="w-full" type="submit" disabled={followUpDisabled}>
                    {createFollowUp.isPending ? "Scheduling..." : "Schedule"}
                  </Button>
                </form>
                </PanelTransition>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
              No lead selected
            </div>
          )}
          </PanelTransition>
        </SectionCard>
      </div>

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open)
          if (!open) setLeadForm(emptyLeadForm)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              createLead.mutate()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Name">
                <Input
                  aria-label="Name"
                  value={leadForm.name}
                  onChange={(event) => setLeadFormValue(setLeadForm, "name", event.target.value)}
                  className="h-11"
                />
              </FormField>
              <FormField label="Phone number">
                <Input
                  aria-label="Phone number"
                  value={leadForm.phone}
                  onChange={(event) => setLeadFormValue(setLeadForm, "phone", event.target.value)}
                  className="h-11"
                />
              </FormField>
            </div>

            <FormField label="Email">
              <Input
                aria-label="Email"
                type="email"
                value={leadForm.email}
                onChange={(event) => setLeadFormValue(setLeadForm, "email", event.target.value)}
                className="h-11"
              />
            </FormField>

            <FormField label="Search property">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search property"
                  value={leadForm.propertySearch}
                  onChange={(event) => setLeadFormValue(setLeadForm, "propertySearch", event.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Property">
                <Select
                  value={leadForm.projectId}
                  onValueChange={(value) =>
                    setLeadForm((form) => ({ ...form, projectId: value, configId: "" }))
                  }
                >
                  <SelectTrigger className="h-11 w-full" aria-label="Property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((project) => (
                      <SelectItem key={String(projectIdOf(project))} value={String(projectIdOf(project))}>
                        {projectNameOf(project)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Config">
                <Select
                  value={leadForm.configId}
                  onValueChange={(value) => setLeadFormValue(setLeadForm, "configId", value)}
                  disabled={!leadForm.projectId || configs.length === 0}
                >
                  <SelectTrigger className="h-11 w-full" aria-label="Config">
                    <SelectValue placeholder="Select config" />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((config) => (
                      <SelectItem key={String(configIdOf(config))} value={String(configIdOf(config))}>
                        {configLabelOf(config)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDisabled}>
                {createLead.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-3 rounded-md border border-border/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-words text-right font-medium", mono ? "font-mono text-xs tabular-nums" : "")}>
        {displayValue(value)}
      </span>
    </div>
  )
}

function setLeadFormValue(setLeadForm, key, value) {
  setLeadForm((form) => ({ ...form, [key]: value }))
}

function invalidateLeads(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  queryClient.invalidateQueries({ queryKey: ["v0", "leads"] })
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function stringValue(value) {
  return value == null ? "" : String(value)
}

function firstValue(record, keys) {
  if (!record || typeof record !== "object") return undefined
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function projectIdOf(project) {
  return firstValue(project, ["id", "projectId", "_id", "uuid"])
}

function projectNameOf(project) {
  return stringValue(firstValue(project, ["projectName", "name", "title", "propertyName"]) ?? "Untitled project")
}

function projectConfigsOf(project) {
  const configs = firstValue(project, ["configs", "configurations", "configurationDetails", "projectConfigs"])
  if (Array.isArray(configs)) return configs.filter((config) => configIdOf(config))
  if (configs && typeof configs === "object") return [configs].filter((config) => configIdOf(config))
  const configId = firstValue(project, ["configId", "configurationId", "config_id"])
  if (!configId) return []
  return [
    {
      id: configId,
      configLabel: firstValue(project, ["config", "configuration", "bhk", "propertyType"]) ?? String(configId),
    },
  ]
}

function configIdOf(config) {
  return firstValue(config, ["id", "configId", "configurationId", "config_id", "uuid"])
}

function configLabelOf(config) {
  const label = firstValue(config, ["configLabel", "label", "name", "configuration", "flatType", "propertyType"])
  const bhk = firstValue(config, ["bhk"])
  if (label && bhk && !String(label).includes(String(bhk))) return `${bhk} BHK ${label}`
  if (label) return String(label)
  if (bhk) return `${bhk} BHK`
  return String(configIdOf(config) ?? "Configuration")
}

function leadName(lead) {
  return displayValue(lead.customerName ?? lead.customer, "Unnamed lead")
}

function displayValue(value, fallback = "-") {
  return value === undefined || value === null || value === "" ? fallback : String(value)
}

function normalizeStatus(status) {
  return stringValue(status).trim().toLowerCase()
}

function statusTone(status) {
  const normalized = normalizeStatus(status)
  if (normalized === "new") return "primary"
  if (normalized === "interested") return "success"
  if (normalized === "pending") return "warning"
  return "neutral"
}

function numericId(value) {
  if (value === undefined || value === null || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function numericOrString(value) {
  const numeric = numericId(value)
  return numeric ?? value
}

function ownerUserIdForLead(lead, user) {
  return (
    numericId(lead?.raw?.assignedEmployeeId) ??
    numericId(lead?.raw?.ownerUserId) ??
    numericId(user?.id)
  )
}

function formatLocalDateTime(value) {
  const trimmed = stringValue(value).trim()
  if (!trimmed) return trimmed
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

function isFollowUpLead(lead, followUpLeadIds) {
  const status = normalizeStatus(lead.status).replace(/[\s-]+/g, "_")
  const followUpStatuses = new Set(["pending", "contacted", "interested", "site_visit", "negotiation", "follow_up"])
  if (followUpStatuses.has(status)) return true
  if (followUpLeadIds.has(String(lead.id))) return true
  const nextFollowUp = firstValue(lead.raw ?? lead, [
    "nextFollowUp",
    "nextFollowUpAt",
    "nextFollowUpDate",
    "followUpAt",
    "scheduledAt",
  ])
  return Boolean(nextFollowUp)
}

function followUpItemsOf(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []
  const items = firstValue(data, ["items", "followUps", "data", "records"])
  return Array.isArray(items) ? items : []
}

function pendingTodayCount(pendingCountData, dashboardData, followUpItems) {
  const apiCount = numericId(firstValue(pendingCountData, ["pendingTodayCount", "count", "pendingCount", "total"]))
  if (apiCount != null) return apiCount
  const dashboardCount = numericId(firstValue(dashboardData, ["pendingTodayCount"]))
  if (dashboardCount != null) return dashboardCount
  const today = dateOnlyLocal(new Date())
  return followUpItems.filter((item) => {
    const scheduled = stringValue(firstValue(item, ["scheduledAt", "scheduledDate", "date"]))
    if (!scheduled.startsWith(today)) return false
    return !Boolean(firstValue(item, ["completed", "isCompleted"]))
  }).length
}

function dateOnlyLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function setDateRange(range, setFromDate, setToDate) {
  if (range === "default") {
    setFromDate("")
    setToDate("")
    return
  }
  const today = new Date()
  setFromDate(dateOnlyLocal(today))
  setToDate(dateOnlyLocal(addDays(today, range === "7d" ? 6 : 29)))
}
