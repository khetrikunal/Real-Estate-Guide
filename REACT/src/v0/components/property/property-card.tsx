import type { CSSProperties, MouseEvent, ReactNode } from "react"
import { useState } from "react"
import { Building2, ExternalLink, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Property } from "@/lib/data"
import { getPropertyViewTransitionName, useViewTransitionNavigate } from "@app/motion"

interface PropertyCardProps {
  property: Property
  href?: string
  variant?: "row" | "grid"
  action?: ReactNode
  className?: string
}

export function PropertyCard({ property, href, variant = "row", action, className }: PropertyCardProps) {
  const navigateWithTransition = useViewTransitionNavigate()
  const [coverFailed, setCoverFailed] = useState(false)
  const sold = Number(property.unitsSold ?? 0)
  const total = Number(property.unitsTotal ?? 1) || 1

  const pct = total > 0 ? (sold / total) * 100 : 0
  const propertyTransitionName = getPropertyViewTransitionName(property.id)
  const hasCover = Boolean(property.cover) && !property.noImage && !coverFailed
  const targetHref = href ?? `/${property.id}/configurations`
  const locationUrl = property.googleMapsUrl?.trim()
  const basicInfo = [
    property.config || "Configuration pending",
    titleCase(property.status),
    property.address ? `${property.address}, ${property.city}` : property.city,
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

  const cover = (
    <div
      className={cn(
        "border-border/80 bg-muted/30 relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border",
        variant === "row" ? "h-16 w-16" : "h-40 w-full",
      )}
    >
      <div className="reference-cover-glow" />
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
        </div>
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
        <div className="bg-border ml-auto h-1 w-24 overflow-hidden rounded-full">
          <div className="bg-primary h-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
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
        <div className="mt-4">{meta}</div>
        {action ? <div className="mt-4">{action}</div> : null}
      </>
    )

  const cardClassName = cn(
    "group surface-elevated motion-card border-border/80 hover:border-ring/30 focus-visible:ring-ring/35 relative flex rounded-xl border p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-[0_24px_52px_-32px_rgba(0,0,0,0.55)] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transform-none",
    variant === "row" ? "items-center gap-4" : "flex-col",
    className,
  )

  if (href && !action) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cardClassName}
        onClick={handleNavigate}
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
      </div>
    )
  }

  return <div className={cardClassName}>{inner}</div>
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}
