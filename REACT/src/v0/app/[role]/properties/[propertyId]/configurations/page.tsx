"use client"

import Link from "next/link"
import { use, useMemo } from "react"
import { ChevronRight, ExternalLink, MapPin, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { RevealSection } from "@app/motion"
import { useProjectsData } from "@/lib/live-data"
import { cn } from "@/lib/utils"
import { getConfigurationArea, getConfigurationLabel, normalizeProjectConfigurations } from "@/lib/property-configs"

type RoleParams = { role: string } | Promise<{ role: string }>

type RouteParams = {
  role: string
  propertyId: string
}

function isPromiseParams(params: RoleParams): params is Promise<{ role: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

export default function PropertyConfigurationsPage({
  params,
}: {
  params: RouteParams | Promise<RouteParams>
}) {
  const resolved = isPromiseParams(params as any) ? (use(params as any) as any) : (params as any)
  const { role, propertyId } = resolved as RouteParams

  return <PropertyConfigurationsContent role={role} propertyId={propertyId} />
}


function PropertyConfigurationsContent({ role, propertyId }: { role: string; propertyId: string }) {
  const { projects } = useProjectsData()

  const project = useMemo(() => projects.find((p) => p.id === propertyId) ?? null, [projects, propertyId])

  const configs = useMemo(() => normalizeProjectConfigurations(project), [project])
  const locationUrl = project?.googleMapsUrl?.trim()

  return (
    <PageContainer className="max-w-[1720px] py-5">
      <div className="reference-page-panel px-10 py-10">
        <PageHeader
          eyebrow="Configurations"
          title="Configurations"
          description="Select a configuration to view its complete details and documents."
          actions={
            <Button asChild variant="secondary" size="sm" className="gap-1.5">
              <Link href={`/${role}/properties`}>
                <RotateCcw className="h-4 w-4" />
                Back to properties
              </Link>
            </Button>
          }
        />

        {project ? (
          <RevealSection className="mt-6">
            <SectionCard
              eyebrow={project.city}
              title={project.name}
              description={
                <span className="flex flex-col gap-1 text-sm">
                  <span>{project.config} · {project.unitsTotal} total units · {project.unitsSold} sold</span>
                  <span>{project.address ? `${project.address}, ` : ""}{project.area ?? ""}</span>
                </span>
              }
              actions={
                locationUrl ? (
                  <Button asChild variant="secondary" size="sm" className="gap-1.5">
                    <a href={locationUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4" />
                      Open map
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : null
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {configs.map((cfg: any) => {
                  const cfgId = String(cfg.id)
                  const cfgName = getConfigurationLabel(cfg)
                  const cfgArea = getConfigurationArea(cfg)
                  const cfgPrice = cfg.price ?? (typeof cfg.priceValue === "number" ? `₹${cfg.priceValue}` : "")


                  return (
                    <Link
                      key={cfgId}
                      href={`/${role}/properties/${project.id}/configurations/${cfgId}`}
                      className={cn(
                        "group surface-elevated motion-card rounded-xl border border-border/80 p-4 transition-colors hover:border-ring/30 hover:bg-muted/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-foreground">{cfgName}</div>
                          <div className="text-muted-foreground mt-1 text-xs">{cfgArea}</div>
                          {cfg.units ? (
                            <div className="text-muted-foreground mt-1 text-xs">
                              {cfg.units} units
                              {cfg.unitsSold ? ` · ${cfg.unitsSold} sold` : ""}
                            </div>
                          ) : null}
                          {cfgPrice ? <div className="mt-2 text-primary text-sm font-semibold">{cfgPrice}</div> : null}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </SectionCard>
          </RevealSection>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-8 text-center text-sm font-semibold">
            Property not found.
          </div>
        )}
      </div>
    </PageContainer>
  )
}

