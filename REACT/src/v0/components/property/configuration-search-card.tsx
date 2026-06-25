import Link from "next/link"
import type { CSSProperties } from "react"
import { Building2, FileText, Image, MapPin, Ruler, Wallet } from "lucide-react"

import { cn } from "@/lib/utils"
import { StatusPill } from "@/components/shell/status-pill"
import { getPropertyViewTransitionName } from "@app/motion"

type ConfigurationSearchResult = {
  id: string
  projectId: string
  projectName: string
  projectStatus: string
  city: string
  area?: string
  address?: string
  pincode?: string
  builderName: string
  cover?: string
  hasCover: boolean
  documentsCount: number
  configLabel: string
  configurationType: string
  propertyType: string
  listingType: string
  price: number
  priceText: string
  areaText: string
  carpetArea?: number
  builtUpArea?: number
  unitsText: string
  parkingText: string
  completionText: string
  href: string
  className?: string
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("sold") || normalized.includes("closed") || normalized.includes("inactive")) return "danger"
  if (normalized.includes("draft") || normalized.includes("pending")) return "warning"
  if (normalized.includes("active") || normalized.includes("ongoing")) return "success"
  return "neutral"
}

export function ConfigurationSearchResultCard({ result }: { result: ConfigurationSearchResult }) {
  const transitionName = getPropertyViewTransitionName(result.id)
  const location = [result.city, result.area].filter(Boolean).join(" · ") || "Location pending"
  const address = [result.address, result.pincode].filter(Boolean).join(" · ")
  const availability = [result.unitsText, result.listingType, result.parkingText].filter(Boolean).join(" / ")
  const documentText =
    result.documentsCount > 0
      ? `${result.documentsCount} document${result.documentsCount === 1 ? "" : "s"}`
      : result.hasCover
        ? "Cover image only"
        : "No documents/images listed"

  return (
    <Link
      href={result.href}
      className={cn(
        "group surface-elevated motion-card border-border/80 hover:border-ring/30 focus-visible:ring-ring/35 relative flex flex-col gap-5 rounded-xl border p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_24px_52px_-32px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 motion-reduce:transform-none",
        result.className,
      )}
      style={{ viewTransitionName: transitionName } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
            {result.projectName}
          </div>
          <h3 className="mt-1 truncate text-xl font-semibold tracking-tight">{result.configLabel}</h3>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {result.configurationType}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          </div>
          {address ? <div className="text-muted-foreground mt-1 text-xs">{address}</div> : null}
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Price</div>
          <div className="text-primary mt-0.5 font-mono text-2xl font-semibold tabular">{result.priceText}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoPill icon={<Ruler className="h-3.5 w-3.5" />} label="Area" value={result.areaText} />
        <InfoPill icon={<Wallet className="h-3.5 w-3.5" />} label="Availability" value={availability || "-"} />
        <InfoPill icon={<FileText className="h-3.5 w-3.5" />} label="Documents" value={documentText} />
        <InfoPill icon={<Image className="h-3.5 w-3.5" />} label="Media" value={result.hasCover ? "Cover image available" : "No cover image"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={statusTone(result.projectStatus)} dot>{result.projectStatus}</StatusPill>
        {result.propertyType ? <StatusPill tone="info">{result.propertyType}</StatusPill> : null}
        {result.listingType ? <StatusPill tone="neutral">{result.listingType}</StatusPill> : null}
        {result.completionText !== "-" ? <StatusPill tone="neutral">Completion {result.completionText}</StatusPill> : null}
      </div>

      {result.builderName ? (
        <div className="border-border bg-muted/30 rounded-lg border p-3 text-sm">
          <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Builder</div>
          <div className="mt-1 font-medium">{result.builderName}</div>
        </div>
      ) : null}
    </Link>
  )
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
      <div className="text-muted-foreground bg-background/70 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">{label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
      </div>
    </div>
  )
}
