import type { CSSProperties, MouseEvent, ReactNode } from "react"
import { useState } from "react"
import { Building2, ExternalLink, MapPin, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import type { Property } from "@/lib/data"
import { getPropertyViewTransitionName, useViewTransitionNavigate } from "@app/motion"

interface PropertyCardProps {
  property: Property
  href?: string
  variant?: "row" | "grid"
  action?: ReactNode
  className?: string
  onDelete?: (property: Property) => void
}

export function PropertyCard({ property, href, variant = "row", action, className, onDelete }: PropertyCardProps) {
  const navigateWithTransition = useViewTransitionNavigate()
  const [coverFailed, setCoverFailed] = useState(false)
  const sold = Number(property.unitsSold ?? 0)
  const total = Number(property.unitsTotal ?? 1) || 1

  const pct = total > 0 ? (sold / total) * 100 : 0
  const propertyTransitionName = getPropertyViewTransitionName(property.id)
  const hasCover = Boolean(property.cover) && !property.noImage && !coverFailed
  const targetHref = href ?? `/${property.id}/configurations`
  const locationUrl = property.googleMapsUrl?.trim()
  const locationText = property.city && property.area
    ? `${property.city} → ${property.area}`
    : property.city || property.area || ""
  const basicInfo = [
    property.config || "Configuration pending",
    titleCase(property.status),
    property.address ? `${property.address}, ${locationText}` : locationText,
  ].filter((value): value is string => Boolean(value))

  const handleNavigate = () => {
    if (!targetHref) return
    navigateWithTransition(targetHref)
  }

  const handleLocationClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (locationUrl) window.open(locationUrl, "_blank", "noopener,noreferrer")
  }

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (onDelete) onDelete(property)
  }

  const cover = (
    <div
      className={cn(
        "property-cover relative flex shrink-0 items-center justify-center overflow-hidden",
        variant === "row" ? "h-20 w-20 rounded-lg" : "h-44 w-full",
      )}
    >
      {variant === 'grid' && <Badge variant="outline" className="absolute top-3 left-3 z-10 border-white/60 bg-white/90 text-slate-600 text-[9px] backdrop-blur">{titleCase(property.status)}</Badge>}
      {hasCover ? (
        <img
          src={property.cover}
          alt={property.name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setCoverFailed(true)}
        />
      ) : property.noImage || coverFailed ? (
        <div className="text-muted-foreground flex flex-col items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
          <Building2 className="h-4 w-4" />
          No image
        </div>
      ) : (
        <Building2 className="text-muted-foreground/60 h-7 w-7" />
      )}
    </div>
  )

  const meta = (
    <>
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-bold text-foreground">
            {property.name}
          </div>
          <div className="text-muted-foreground mt-2 grid gap-1 text-xs">
            {basicInfo.map((info) => (
              <div key={info} className="truncate">
                {info}
              </div>
            ))}
            {property.id && <div className="truncate text-[10px] uppercase tracking-wide">ID: {property.id}</div>}
          </div>
          <div className="mt-4 text-lg font-semibold tracking-tight text-foreground">{property.price}<span className="ml-2 text-[9px] font-normal tracking-normal text-muted-foreground">Starting price</span></div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className={cn(
              "border-border bg-background/70 text-muted-foreground hover:text-primary hover:border-ring/50 shrink-0 rounded-full border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              !locationUrl && "cursor-not-allowed opacity-40",
            )}
            disabled={!locationUrl}
            aria-label={locationUrl ? "Open Google Maps location" : "No Google Maps location saved"}
            onClick={handleLocationClick}
          >
            <MapPin className="h-4 w-4" />
            {locationUrl ? <ExternalLink className="text-primary/70 -ml-0.5 -mt-0.5 h-2.5 w-2.5" /> : null}
          </button>
          {onDelete && !action ? (
            <button
              type="button"
              data-no-navigate="true"
              className="border-border bg-background/70 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40 shrink-0 rounded-full border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
              title="Delete Project"
              aria-label={`Delete ${property.name}`}
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[11px]">
        <span className="text-muted-foreground rounded-full bg-white/[0.055] px-2.5 py-1 font-medium">
          {property.config}
        </span>
        <span className="text-muted-foreground">
          Units{" "}
          <span className="text-foreground font-mono font-semibold tabular">
            {sold}/{total}
          </span>{" "}
          sold
        </span>
        <Progress className="ml-auto h-1 w-20" value={Math.max(0, Math.min(100, pct))} aria-label="Units sold" />
      </div>
    </>
  )

  const inner =
    variant === "row" ? (
      <>
        {cover}
        <div className="min-w-0 flex-1">{meta}</div>
        {action ? <div className="ml-auto shrink-0">{action}</div> : null}
      </>
    ) : (
      <>
        {cover}
        <div className="property-card-body">{meta}</div>
        {action ? <div className="mt-4">{action}</div> : null}
      </>
    )

  const cardClassName = cn(
    "workspace-property-card group relative flex gap-0 py-0 ring-0 focus-visible:ring-2 focus-visible:outline-none",
    variant === "row" ? "flex-row items-center gap-4 p-4" : "flex-col",
    className,
  )

  if (href) {
    return (
      <Card
        role="button"
        tabIndex={0}
        className={cardClassName}
        onClick={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.closest("button") || target?.closest("a") || target?.closest("[data-no-navigate]")) {
            return
          }
          handleNavigate()
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleNavigate()
          }
        }}
        style={{ viewTransitionName: propertyTransitionName } as CSSProperties}
      >
        {inner}
      </Card>
    )
  }

  return <Card className={cardClassName}>{inner}</Card>
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}
