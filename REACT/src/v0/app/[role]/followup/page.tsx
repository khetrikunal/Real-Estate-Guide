// @ts-nocheck
"use client"

import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock3,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import { useAuth } from "@app/auth/AuthContext"

import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatCard } from "@/components/shell/stat-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Textarea } from "@/components/ui/textarea"
import { useFollowUpsData, useLeadsData } from "@/lib/live-data"
import { AnimatedRows, OperationalKpiGroup, PanelTransition, RevealSection } from "@/motion"

const statusTone = {
  scheduled: "primary",
  completed: "success",
  overdue: "danger",
} as const

const statusLabel = {
  scheduled: "Scheduled",
  completed: "Completed",
  overdue: "Overdue",
} as const

const callTypes = [
  { value: "FIRST_CALL", label: "First call" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "SITE_VISIT", label: "Site visit" },
  { value: "CLOSURE", label: "Closure" },
  { value: "NOT_INTERESTED", label: "Not interested" },
]

const emptyFollowUpForm = {
  leadId: "",
  search: "",
  callingType: "FOLLOW_UP",
  scheduledAt: "",
  description: "",
}

export default function FollowupPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [range, setRange] = useState<"today" | "7d" | "30d" | "default">("default")
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleAt, setRescheduleAt] = useState("")
  const [completeTarget, setCompleteTarget] = useState(null)
  const [completionNote, setCompletionNote] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm)
  const rangeWindow = useMemo(() => followUpRange(range), [range])
  const { followUps, isFetching, error } = useFollowUpsData(rangeWindow.from, rangeWindow.to)
  const { leads } = useLeadsData()

  const invalidateFollowUps = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    queryClient.invalidateQueries({ queryKey: [ "v0", "follow-ups" ] })
    queryClient.invalidateQueries({ queryKey: [ "v0", "leads" ] })
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const lead = leads.find((item) => String(item.id) === followUpForm.leadId)
      if (!lead) throw new Error("Lead required")
      const ownerUserId = ownerUserIdForLead(lead, auth.user)
      if (ownerUserId == null) throw new Error("Owner required")
      return estateApi.followUps.create(lead.id, {
        ownerUserId,
        callingType: followUpForm.callingType,
        scheduledAt: formatLocalDateTime(followUpForm.scheduledAt),
        description: followUpForm.description.trim() || undefined,
      })
    },
    onSuccess: () => {
      setShowCreate(false)
      setFollowUpForm(emptyFollowUpForm)
      invalidateFollowUps()
    },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      estateApi.followUps.complete(id, { completionNote: note || "Completed from follow-up dashboard" }),
    onSuccess: () => {
      setCompleteTarget(null)
      setCompletionNote("")
      invalidateFollowUps()
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      estateApi.followUps.reschedule(id, { scheduledAt: formatLocalDateTime(scheduledAt) }),
    onSuccess: () => {
      setReschedulingId(null)
      setRescheduleAt("")
      invalidateFollowUps()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estateApi.followUps.remove(id),
    onSuccess: invalidateFollowUps,
  })

  const stats = useMemo(
    () => ({
      total: followUps.length,
      overdue: followUps.filter((f) => f.status === "overdue").length,
      completed: followUps.filter((f) => f.status === "completed").length,
      scheduled: followUps.filter((f) => f.status === "scheduled").length,
    }),
    [followUps],
  )

  const filteredLeads = useMemo(() => {
    const term = followUpForm.search.trim().toLowerCase()
    if (!term) return leads
    return leads.filter((lead) =>
      [leadName(lead), lead.phone, lead.email, lead.projectName, lead.propertyInterest, lead.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
  }, [followUpForm.search, leads])

  const selectedLead = followUpForm.leadId
    ? leads.find((lead) => String(lead.id) === followUpForm.leadId) ?? null
    : null
  const createDisabled =
    !followUpForm.leadId || !followUpForm.scheduledAt || createMutation.isPending

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })

  return (
    <PageContainer className="max-w-[1560px] py-4">
      <div className="reference-page-panel px-6 py-6 sm:px-8">
        <PageHeader
          eyebrow="Client operations"
          title="Follow-ups"
          description="Keep your next conversation, visit, and client milestone in focus."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="border-border bg-muted/40 flex items-center gap-3 rounded-xl border px-4 py-2">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-sm font-medium">Today</span>
                <span className="text-foreground text-sm font-semibold">{today}</span>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                Add follow-up
              </Button>
            </div>
          }
        />

        <OperationalKpiGroup className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total" value={String(stats.total)} icon={Clock3} tone="warning" hint="Visible touchpoints" />
          <StatCard label="Overdue" value={String(stats.overdue)} icon={CalendarClock} tone="danger" hint="Past due" />
          <StatCard label="Scheduled" value={String(stats.scheduled)} icon={Calendar} tone="primary" hint="Upcoming" />
          <StatCard label="Completed" value={String(stats.completed)} icon={CheckCircle2} tone="success" hint="Closed" />
        </OperationalKpiGroup>

        <div className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-2">
          {[
            ["default", "Default"],
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={range === value ? "default" : "ghost"}
              onClick={() => setRange(value as typeof range)}
            >
              {label}
            </Button>
          ))}
        </div>

        <RevealSection className="mt-8">
          <SectionCard
            eyebrow={isFetching ? "Loading" : `${stats.total} Total`}
            title="Follow-up timeline"
            description={error ? "Unable to load follow-ups." : "Live CRM follow-ups, most urgent first."}
            contentClassName="p-0"
          >
            {isFetching ? (
              <PanelTransition motionKey="followups-loading">
                <div className="text-muted-foreground px-5 py-6 text-sm sm:px-6" role="status" aria-live="polite">
                  Loading follow-ups
                </div>
              </PanelTransition>
            ) : followUps.length === 0 ? (
              <PanelTransition motionKey="followups-empty">
                <div className="text-muted-foreground px-5 py-6 text-sm sm:px-6" role="status" aria-live="polite">
                  No follow-ups in this window. Add one from a CRM lead.
                </div>
              </PanelTransition>
            ) : (
              <AnimatedRows className="divide-border divide-y" role="list">
                {followUps.map((f) => {
                  const isCompleted = f.status === "completed"
                  const isCompleting = completeMutation.isPending && completeMutation.variables?.id === f.id
                  const isRescheduling =
                    rescheduleMutation.isPending && rescheduleMutation.variables?.id === f.id
                  const isDeleting = deleteMutation.isPending && deleteMutation.variables === f.id
                  const isRowMutating = isCompleting || isRescheduling || isDeleting
                  const raw = f.raw ?? {}
                  const callType = displayEnum(raw.callingType ?? raw.type ?? "FOLLOW_UP")
                  const leadMeta = [
                    stringValue(raw.leadPhone ?? raw.phone),
                    stringValue(raw.leadEmail ?? raw.email),
                    stringValue(raw.projectName ?? raw.propertyInterest),
                  ]
                    .filter(Boolean)
                    .join(" · ")

                  return (
                    <div
                      key={f.id}
                      role="listitem"
                      className="grid gap-4 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="border-border bg-muted/30 flex h-10 w-10 items-center justify-center rounded-xl border">
                          <PhoneCall className="text-muted-foreground h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Scheduled</div>
                          <div className="font-mono text-sm font-semibold tabular-nums">{f.when}</div>
                          <div className="text-muted-foreground mt-1 text-[11px]">{callType}</div>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                            {f.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{f.customer}</span>
                            <StatusPill tone={statusTone[f.status]} dot>
                              {statusLabel[f.status]}
                            </StatusPill>
                          </div>
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {f.description || "No notes added"}
                          </p>
                          {leadMeta ? <p className="text-muted-foreground mt-1 truncate text-[11px]">{leadMeta}</p> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {reschedulingId === f.id && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              className="h-8 w-[190px] text-xs"
                              aria-label={`Reschedule ${f.customer}`}
                              value={rescheduleAt}
                              disabled={isRowMutating}
                              onChange={(event) => setRescheduleAt(event.target.value)}
                            />
                            <Button
                              size="sm"
                              disabled={!rescheduleAt || isRowMutating}
                              onClick={() => rescheduleMutation.mutate({ id: f.id, scheduledAt: rescheduleAt })}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="gap-1.5 transition-transform active:scale-[0.98]"
                          aria-label={`Complete follow-up for ${f.customer}`}
                          disabled={isCompleted || isRowMutating}
                          onClick={() => {
                            setCompleteTarget(f)
                            setCompletionNote("")
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 transition-transform active:scale-[0.96]"
                          aria-label={`Reschedule ${f.customer}`}
                          aria-expanded={reschedulingId === f.id}
                          disabled={isRowMutating}
                          onClick={() => {
                            setReschedulingId((current) => (current === f.id ? null : f.id))
                            setRescheduleAt(toDatetimeLocalValue(f.scheduledAt))
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8 transition-transform active:scale-[0.96]"
                          aria-label={`Delete follow-up for ${f.customer}`}
                          disabled={isRowMutating}
                          onClick={() => deleteMutation.mutate(f.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </AnimatedRows>
            )}
          </SectionCard>
        </RevealSection>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden border-border/50 shadow-2xl">
          <div className="bg-gradient-to-b from-muted/30 to-background px-6 py-6 sm:px-8 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Schedule follow-up</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Search for a CRM lead and set up a new touchpoint.</p>
            </DialogHeader>
          </div>
          <form
            className="space-y-6 px-6 py-6 sm:px-8"
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate()
            }}
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Search CRM lead
              </label>
              <div className="relative group">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  className="h-11 pl-9 bg-background/50 border-border/60 focus-visible:ring-primary/20 transition-all duration-200 shadow-sm"
                  value={followUpForm.search}
                  placeholder="Search by name, phone, email, property..."
                  onChange={(event) => setFollowUpForm((form) => ({ ...form, search: event.target.value }))}
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-muted/20 p-2 shadow-inner">
              {filteredLeads.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <UserRound className="h-8 w-8 opacity-20" />
                  No CRM leads match this search.
                </div>
              ) : (
                filteredLeads.slice(0, 20).map((lead) => {
                  const active = String(lead.id) === followUpForm.leadId
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      className={`flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                        active ? "bg-primary text-primary-foreground shadow-md scale-[0.99]" : "hover:bg-muted/60"
                      }`}
                      onClick={() => setFollowUpForm((form) => ({ ...form, leadId: String(lead.id) }))}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <UserRound className="h-4 w-4" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{leadName(lead)}</span>
                        <span className={`block truncate text-[11px] mt-0.5 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {[lead.phone, lead.email, lead.projectName ?? lead.propertyInterest].filter(Boolean).join(" · ") || "No lead metadata"}
                        </span>
                      </span>
                      {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-foreground" />}
                    </button>
                  )
                })
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </label>
                <Select
                  value={followUpForm.callingType}
                  onValueChange={(value) => setFollowUpForm((form) => ({ ...form, callingType: value }))}
                >
                  <SelectTrigger className="h-11 bg-background/50 border-border/60 focus:ring-primary/20 transition-all duration-200 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {callTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Date and time
                </label>
                <Input
                  type="datetime-local"
                  className="h-11 bg-background/50 border-border/60 focus-visible:ring-primary/20 transition-all duration-200 shadow-sm"
                  value={followUpForm.scheduledAt}
                  onChange={(event) => setFollowUpForm((form) => ({ ...form, scheduledAt: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </label>
              <Textarea
                className="min-h-[100px] resize-none bg-background/50 border-border/60 focus-visible:ring-primary/20 transition-all duration-200 shadow-sm"
                placeholder="Add contextual notes for this touchpoint..."
                value={followUpForm.description}
                onChange={(event) => setFollowUpForm((form) => ({ ...form, description: event.target.value }))}
              />
            </div>

            {selectedLead ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{leadName(selectedLead)}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    Owner #{ownerUserIdForLead(selectedLead, auth.user) ?? "missing"} · {selectedLead.projectName ?? selectedLead.propertyInterest ?? "No project linked"}
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="pt-2 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="hover:bg-muted/50">
                Cancel
              </Button>
              <Button type="submit" disabled={createDisabled} className="shadow-md hover:shadow-lg transition-all duration-200">
                {createMutation.isPending ? "Scheduling..." : "Schedule Follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(completeTarget)} onOpenChange={(open) => !open && setCompleteTarget(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark follow-up for <span className="font-medium text-foreground">{completeTarget?.customer}</span> as completed.
            </p>
            <Textarea
              className="min-h-24"
              placeholder="Completion note"
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCompleteTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate({ id: completeTarget.id, note: completionNote.trim() })}
              >
                {completeMutation.isPending ? "Completing..." : "Complete"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function followUpRange(range: "today" | "7d" | "30d" | "default") {
  if (range === "default") return { from: undefined, to: undefined }
  const today = new Date()
  if (range === "today") return { from: dateOnlyLocal(today), to: dateOnlyLocal(today) }
  return { from: dateOnlyLocal(today), to: dateOnlyLocal(addDays(today, range === "7d" ? 6 : 29)) }
}

function dateOnlyLocal(date: Date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatLocalDateTime(value: string) {
  const trimmed = stringValue(value).trim()
  if (!trimmed) return trimmed
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

function toDatetimeLocalValue(value: string) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 16)
  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, "0")
  const dd = String(parsed.getDate()).padStart(2, "0")
  const hh = String(parsed.getHours()).padStart(2, "0")
  const mi = String(parsed.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function ownerUserIdForLead(lead, user) {
  return numericId(lead?.raw?.assignedEmployeeId) ?? numericId(lead?.raw?.ownerUserId) ?? numericId(user?.id)
}

function leadName(lead) {
  return stringValue(lead?.customerName ?? lead?.customer ?? lead?.name) || "Unnamed lead"
}

function numericId(value) {
  if (value === undefined || value === null || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function displayEnum(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function stringValue(value) {
  return value == null ? "" : String(value)
}
