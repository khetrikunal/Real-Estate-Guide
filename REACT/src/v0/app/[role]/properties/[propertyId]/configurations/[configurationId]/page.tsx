"use client"

import Link from "next/link"
import { use, useMemo } from "react"
import { Download, ExternalLink, MapPin, RotateCcw } from "lucide-react"

import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { Button } from "@/components/ui/button"
import { RevealSection } from "@app/motion"
import { useProjectsData } from "@/lib/live-data"
import { ProjectDocumentsPanel } from "@/components/property/project-documents-panel"
import {
  buildConfigurationDetailRows,
  findNormalizedConfiguration,
  getConfigurationArea,
  getConfigurationLabel,
  normalizeProjectConfigurations,
} from "@/lib/property-configs"

type ApiRecord = Record<string, unknown>

type RouteParams = {
  role: string
  propertyId: string
  configurationId: string
}

type DetailParams = RouteParams | Promise<RouteParams>

function isPromiseParams(params: DetailParams): params is Promise<RouteParams> {
  return typeof (params as Promise<RouteParams>).then === "function"
}

function formatINR(value: unknown) {
  if (typeof value === "string" && value.trim()) return value
  if (typeof value === "number" && Number.isFinite(value)) return `₹${value.toLocaleString("en-IN")}`
  return "—"
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ")
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

function asRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is ApiRecord => typeof item === "object" && item !== null && !Array.isArray(item))
  return []
}

export default function ConfigurationDetailsPage({ params }: { params: DetailParams }) {
  const resolved = isPromiseParams(params) ? use(params) : params

  return (
    <ConfigurationDetailsContent
      role={resolved.role}
      propertyId={resolved.propertyId}
      configurationId={resolved.configurationId}
    />
  )
}

function ConfigurationDetailsContent({
  role,
  propertyId,
  configurationId,
}: {
  role: string
  propertyId: string
  configurationId: string
}) {
  const { projects } = useProjectsData()

  const project = useMemo(() => projects.find((p) => p.id === propertyId) ?? null, [projects, propertyId])
  const configurations = useMemo(() => normalizeProjectConfigurations(project), [project])
  const configuration = useMemo(
    () => findNormalizedConfiguration(project, configurationId) ?? configurations[0] ?? null,
    [configurationId, configurations, project],
  )
  const detailRows = useMemo(() => buildConfigurationDetailRows(configuration), [configuration])
  const unitInventory = useMemo(() => asRecords(configuration?.raw.unitInventory), [configuration])
  const locationUrl = project?.googleMapsUrl?.trim()
  const configIdForDocs = configuration?.id && configuration.id !== `${project?.id}-default` ? String(configuration.id) : undefined
  const configLabel = getConfigurationLabel(configuration)

  return (
    <PageContainer className="max-w-[1720px] py-5">
      <div className="reference-page-panel px-10 py-10">
        <PageHeader
          eyebrow="Configuration"
          title="Configuration details"
          description="Complete configuration information, documents, and unit inventory."
          actions={
            <Button asChild variant="secondary" size="sm" className="gap-1.5">
              <Link href={`/${role}/properties/${propertyId}/configurations`}>
                <RotateCcw className="h-4 w-4" />
                Back to configurations
              </Link>
            </Button>
          }
        />

        {!project ? (
          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-8 text-center text-sm font-semibold">
            Property not found.
          </div>
        ) : !configuration ? (
          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-8 text-center text-sm font-semibold">
            Configuration not found.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <RevealSection>
              <SectionCard
                eyebrow={project.city}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {project.name}
                    {locationUrl ? (
                      <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                        <a href={locationUrl} target="_blank" rel="noopener noreferrer">
                          <MapPin className="h-3.5 w-3.5" />
                          Open map
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
                  </span>
                }
                description={`${project.address ?? project.area ?? project.city} · ${project.config}`}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryItem label="Configuration" value={configLabel} />
                  <SummaryItem label="Area" value={getConfigurationArea(configuration)} />
                  <SummaryItem label="Price" value={formatINR(configuration.priceValue ?? configuration.raw.price)} />
                  <SummaryItem label="Units" value={configuration.units ? `${configuration.units} total` : `${project.unitsTotal} project units`} />
                </div>
              </SectionCard>
            </RevealSection>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <RevealSection className="lg:col-span-1">
                <SectionCard eyebrow="Key fields" title="Configuration summary" description="Primary fields used for this configuration.">
                  <div className="grid grid-cols-1 gap-4">
                    <Field label="Configuration name" value={configLabel} />
                    <Field label="Property type" value={configuration.propertyType || "—"} />
                    <Field label="Listing type" value={configuration.listingType || "—"} />
                    <Field label="Area (Sq. Ft.)" value={getConfigurationArea(configuration)} />
                    <Field label="Price" value={formatINR(configuration.priceValue ?? configuration.raw.price)} />
                    <Field
                      label="Units"
                      value={
                        configuration.units !== undefined
                          ? `${configuration.units}${configuration.unitsSold ? ` / ${configuration.unitsSold} sold` : ""}`
                          : "—"
                      }
                    />
                    <Field
                      label="Parking"
                      value={
                        configuration.parkingAvailable === undefined
                          ? "—"
                          : `${configuration.parkingAvailable ? "Available" : "Not available"}${
                              configuration.parkingCost ? ` · ${formatINR(configuration.parkingCost)}` : ""
                            }`
                      }
                    />
                    <Field label="Completion" value={configuration.completionPercentage !== undefined ? `${configuration.completionPercentage}%` : "—"} />
                  </div>
                </SectionCard>
              </RevealSection>

              <RevealSection className="lg:col-span-2">
                <SectionCard eyebrow="All information" title="Configuration fields" description="All primitive fields stored for this configuration.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {detailRows.length ? (
                      detailRows.map((row) => <Field key={row.label} label={row.label} value={row.value} />)
                    ) : (
                      <div className="text-muted-foreground sm:col-span-2 text-sm">No additional primitive fields are stored for this configuration.</div>
                    )}
                  </div>
                </SectionCard>
              </RevealSection>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <RevealSection className="lg:col-span-2">
                <SectionCard
                  eyebrow="Documents"
                  title={configIdForDocs ? "Configuration documents" : "Project documents"}
                  description={
                    configIdForDocs
                      ? "Files attached specifically to this configuration."
                      : "Project-level files are shown because this configuration has no backend configuration id."
                  }
                >
                  <ProjectDocumentsPanel projectId={propertyId} projectName={project.name} configId={configIdForDocs} />
                </SectionCard>
              </RevealSection>

              <RevealSection className="lg:col-span-1">
                <SectionCard eyebrow="Raw data" title="Stored configuration" description="Full backend payload for audit and troubleshooting.">
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
                    {JSON.stringify(configuration.raw, null, 2)}
                  </pre>
                </SectionCard>
              </RevealSection>
            </div>

            {unitInventory.length ? (
              <RevealSection>
                <SectionCard eyebrow="Inventory" title="Unit inventory" description="Units associated with this configuration.">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {unitInventory.map((unit, index) => (
                      <div
                        key={String(unit.id ?? unit.unitId ?? unit.unitNo ?? index)}
                        className="border-border bg-muted/30 rounded-xl border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-sm">
                              {String(
                                unit.unitLabel ?? unit.unitNo ?? unit.unitNumber ?? `Unit ${index + 1}`
                              )}
                            </div>
                            <div className="text-muted-foreground mt-1 text-xs">
                              {unit.floorNo ? `Floor ${unit.floorNo}` : "Floor pending"}
                            </div>
                          </div>
                          <span className="rounded-full bg-white/[0.055] px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
                            {String(unit.status ?? "Pending")}
                          </span>
                        </div>
                        {unit.amount ? (
                          <div className="text-primary mt-3 font-mono text-sm font-semibold tabular">{formatINR(unit.amount)}</div>
                        ) : null}
                        {unit.buyerName ? (
                          <div className="text-muted-foreground mt-1 text-xs">Buyer: {String(unit.buyerName)}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </RevealSection>
            ) : null}

            <RevealSection>
              <SectionCard eyebrow="Actions" title="Related links" description="Move through the Property Module flow.">
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="secondary" className="gap-1.5">
                    <Link href={`/${role}/properties`}>
                      <RotateCcw className="h-4 w-4" />
                      Property dashboard
                    </Link>
                  </Button>
                  {configuration.raw.fileUrl ?? configuration.raw.downloadUrl ? (
                    <Button asChild variant="ghost" className="gap-1.5">
                      <a
                        href={String(configuration.raw.fileUrl ?? configuration.raw.downloadUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Open configuration file
                      </a>
                    </Button>
                  ) : null}
                  {project.googleMapsUrl ? (
                    <Button asChild variant="ghost" className="gap-1.5">
                      <a href={project.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <MapPin className="h-4 w-4" />
                        Open project location
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </SectionCard>
            </RevealSection>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-muted/20 rounded-xl border p-4">
      <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{label}</div>
      <div className="mt-1 truncate font-semibold text-sm">{value}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  )
}
