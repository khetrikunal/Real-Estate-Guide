"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { use, useMemo, useState } from "react"
import { notFound } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  Trash2,
  Layers,
  FileText,
  ShoppingCart,
  Plus,
  TrendingUp,
} from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { PageContainer } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatusPill } from "@/components/shell/status-pill"
import { ProjectDocumentsPanel } from "@/components/property/project-documents-panel"
import { SellUnitDialog } from "@/components/property/sell-unit-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    const nested = value.data ?? value.content ?? value.items ?? value.results ?? value.records
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
  return value > 0 ? `INR ${new Intl.NumberFormat("en-IN").format(value)}` : "Price pending"
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
  if (normalized.includes("draft") || normalized.includes("pending")) return "warning"
  if (normalized.includes("active") || normalized.includes("ongoing")) return "success"
  return "neutral"
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
  const carpet = firstNumber(config, ["carpetAreaSqft"])
  const saleable = firstNumber(config, ["saleableAreaSqft"])
  if (carpet > 0 && saleable > 0) return `${carpet} carpet / ${saleable} saleable sqft`
  if (saleable > 0) return `${saleable} saleable sqft`
  if (carpet > 0) return `${carpet} carpet sqft`
  return "Area pending"
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
  const { ready, token } = useAuth()
  const { projects, isFetching: isProjectsFetching } = useProjectsData()
  const { leads } = useLeadsData()
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const listProperty = projects.find((p) => p.id === id)
  const projectQuery = useQuery({
    queryKey: ["v0", "project-detail", id],
    queryFn: () => estateApi.projects.detail(id),
    enabled: ready && Boolean(token) && Boolean(id),
    staleTime: 0,
  })

  const project = isRecord(projectQuery.data) ? projectQuery.data : null
  const projectName = firstString(project, ["projectName", "name", "propertyName"], listProperty?.name ?? "Untitled project")
  const projectId = project?.id ?? listProperty?.id ?? id
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
        <SectionCard eyebrow="Property" title="Loading project details" description="Fetching live project data." />
      </PageContainer>
    )
  }
  if (!project && !listProperty) notFound()

  const configs = asRecords(project?.configs)
  const documents = asRecords(project?.documents)
  const sales = asRecords(project?.sales)
  const city = firstString(project, ["city"], listProperty?.city ?? "-")
  const area = firstString(project, ["area"], listProperty?.area ?? "")
  const status = titleCase(firstString(project, ["status", "projectStatus"], listProperty?.status ?? "active"))
  const statusLabel = status || "Active"
  const propertyTypes = Array.from(
    new Set(configs.map((config) => firstString(config, ["propertyType", "configType"], "")).filter(Boolean)),
  )
  const listingTypes = Array.from(
    new Set(configs.map((config) => firstString(config, ["listingType", "sellingType"], "")).filter(Boolean)),
  )
  const primaryConfig = configs[0]
  const basePriceValue =
    firstNumber(project, ["price", "basePrice", "priceValue"]) ||
    configs.reduce((lowest, config) => {
      const price = firstNumber(config, ["price", "basePrice", "amount"])
      if (price <= 0) return lowest
      return lowest === 0 ? price : Math.min(lowest, price)
    }, 0)
  const total =
    firstNumber(project, ["totalUnits", "unitsTotal"]) ||
    configs.reduce((sum, config) => sum + firstNumber(config, ["units", "totalUnits"]), 0) ||
    listProperty?.unitsTotal ||
    0
  const sold =
    firstNumber(project, ["unitsSold", "soldUnits"]) ||
    configs.reduce((sum, config) => sum + firstNumber(config, ["unitsSold", "soldUnits"]), 0) ||
    listProperty?.unitsSold ||
    0
  const pct = total > 0 ? (sold / total) * 100 : 0
  const available = Math.max(total - sold, 0)
  const coverPhoto = mediaUrl(firstString(project, ["coverPhotoUrl", "cover", "coverPhoto", "imageUrl", "thumbnailUrl"], listProperty?.cover ?? ""))
  const address = firstString(project, ["address"], [city, area].filter(Boolean).join(", ") || "-")
  const pincode = firstString(project, ["zipCode", "pincode", "postalCode"], "-")
  const owner = firstString(project, ["addedByName", "uploadedByName", "ownerName"], "-")
  const lastEditor = firstString(project, ["modifiedByName"], owner)
  const completion =
    firstNumber(project, ["completionPercentage", "completion"]) ||
    (configs.length
      ? Math.round(
          configs.reduce((sum, config) => sum + firstNumber(config, ["completionPercentage", "completion"]), 0) /
            configs.length,
        )
      : 0)

  const interestedLeads = matchingLeads.filter((lead) => lead.status === "interested").length
  const closedLeads = matchingLeads.filter((lead) => lead.status === "won" || lead.status === "lost").length
  const conversion = matchingLeads.length > 0 ? Math.round((Math.max(sold, closedLeads) / matchingLeads.length) * 100) : 0
  const propertyTransitionName = getPropertyViewTransitionName(String(projectId))

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/${role}/search-property`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to search
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link href={`/${role}/properties/${projectId}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <RevealSection
        className="surface-elevated border-border relative mt-4 overflow-hidden rounded-2xl border"
        style={{ viewTransitionName: propertyTransitionName } as CSSProperties}
      >
        <div className="bg-muted/30 relative h-56 sm:h-72">
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
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-muted-foreground inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase">
              <MapPin className="h-3 w-3" />
              {city}
              {area ? ` / ${area}` : ""}
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{projectName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill tone={statusTone(statusLabel)} dot>
                {statusLabel}
              </StatusPill>
              <StatusPill tone="neutral">{primaryConfig ? configLabel(primaryConfig) : "Configuration pending"}</StatusPill>
              {propertyTypes.slice(0, 2).map((type) => (
                <StatusPill key={type} tone="info">
                  {titleCase(type)}
                </StatusPill>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Base price</div>
            <div className="text-primary mt-0.5 font-mono text-3xl font-semibold tabular">{formatInr(basePriceValue)}</div>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="mt-6">
        <SectionCard eyebrow="Inventory" title="Units sold">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <OperationalKpiGroup className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Sold" value={`${sold}/${total || 0}`} />
              <Stat label="Available" value={`${available}`} />
              <Stat label="Absorbed" value={`${Math.round(pct)}%`} />
            </OperationalKpiGroup>
            <Button size="sm" className="gap-1.5 lg:mb-1" onClick={() => setSellDialogOpen(true)} disabled={available <= 0}>
              <ShoppingCart className="h-3.5 w-3.5" />
              Sell unit
            </Button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full origin-left bg-primary transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${Math.min(Math.max(pct, 0), 100) / 100})` }}
            />
          </div>
        </SectionCard>
      </RevealSection>

      <Tabs defaultValue={initialTab} className="mt-8">
        <TabsList className="bg-muted/40 border-border h-11 w-full justify-start gap-1 rounded-xl border p-1">
          <TabsTrigger value="details" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Details
          </TabsTrigger>
          <TabsTrigger value="configs" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Configs ({configs.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="sell" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Sell units
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <PanelTransition motionKey="details">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SectionCard className="lg:col-span-2" eyebrow="Overview" title="Property details">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <DetailRow label="Property type" value={propertyTypes.map(titleCase).join(", ") || "-"} />
                  <DetailRow label="Listing type" value={listingTypes.map(titleCase).join(", ") || "-"} />
                  <DetailRow label="Base price" value={formatInr(basePriceValue)} mono />
                  <DetailRow label="Completion" value={completion > 0 ? `${completion}%` : "-"} mono />
                  <DetailRow label="Total units" value={String(total || 0)} mono />
                  <DetailRow label="Configuration" value={configs.length ? `${configs.length} active configs` : "Configuration pending"} />
                  <DetailRow label="Address" value={address} />
                  <DetailRow label="Pincode" value={pincode} mono />
                </dl>
              </SectionCard>

              <div className="flex flex-col gap-6">
                <SectionCard eyebrow="Quick stats" title="Performance">
                  <div className="flex flex-col gap-4">
                    <Stat label="Inquiries" value={String(matchingLeads.length)} />
                    <Stat label="Interested" value={String(interestedLeads)} />
                    <Stat label="Conversion" value={`${conversion}%`} />
                  </div>
                </SectionCard>
                <SectionCard eyebrow="Updated" title="Audit">
                  <div className="text-muted-foreground flex flex-col gap-2 text-sm">
                    <AuditRow label="Created" value={formatDate(project?.createdAt)} />
                    <AuditRow label="Last edit" value={formatDate(project?.updatedAt)} />
                    <AuditRow label="Owner" value={owner} />
                    <AuditRow label="Last editor" value={lastEditor} />
                  </div>
                </SectionCard>
              </div>
            </div>
          </PanelTransition>
        </TabsContent>

        <TabsContent value="configs" className="mt-6">
          <PanelTransition motionKey="configs">
            <SectionCard
              eyebrow="Configurations"
              title="Unit configurations"
              actions={
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add configuration
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                {configs.length ? (
                  configs.map((config, index) => {
                    const configUnits = firstNumber(config, ["units", "totalUnits"])
                    const configSold = firstNumber(config, ["unitsSold", "soldUnits"])
                    const parking = firstBoolean(config, ["parkingAvailable", "parking"])
                    return (
                      <div
                        key={String(config.id ?? index)}
                        className="border-border bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold">{configLabel(config)}</div>
                          <div className="text-muted-foreground text-xs">
                            {configUnits || 0} units / {configSold || 0} sold / {configArea(config)}
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {titleCase(firstString(config, ["listingType", "sellingType"], "-"))}
                            {parking !== undefined ? ` / Parking ${parking ? "available" : "not available"}` : ""}
                          </div>
                        </div>
                        <div className="text-primary font-mono text-sm font-semibold tabular">
                          {formatInr(firstNumber(config, ["price", "basePrice", "amount"]))}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="border-border bg-muted/30 rounded-lg border p-4 text-sm text-muted-foreground">
                    No configurations have been stored for this project yet.
                  </div>
                )}
              </div>
            </SectionCard>
          </PanelTransition>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <PanelTransition motionKey="documents">
            <ProjectDocumentsPanel projectId={String(projectId)} projectName={projectName} />
          </PanelTransition>
        </TabsContent>

        <TabsContent value="sell" className="mt-6">
          <PanelTransition motionKey="sell">
            <SectionCard
              eyebrow="Sell"
              title="Record a unit sale"
              description="Confirm buyer, amount, and config to mark a unit sold."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat label="Available units" value={`${available}`} />
                <Stat label="Recorded sales" value={`${sales.length}`} />
                <Stat label="Sale price" value={formatInr(basePriceValue)} mono />
              </div>
              <Button className="glow-primary mt-6 gap-1.5" onClick={() => setSellDialogOpen(true)} disabled={available <= 0}>
                <ShoppingCart className="h-4 w-4" />
                Open sell unit form
              </Button>
            </SectionCard>
          </PanelTransition>
        </TabsContent>
      </Tabs>

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
      <dd className={`mt-1 text-sm font-semibold ${mono ? "tabular font-mono" : ""}`}>{value}</dd>
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

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-border bg-muted/30 rounded-lg border p-4">
      <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${mono ? "tabular font-mono" : ""}`}>{value}</div>
    </div>
  )
}
