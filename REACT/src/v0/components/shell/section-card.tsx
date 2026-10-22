import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  contentClassName?: string
}

export function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  contentClassName,
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "reference-section surface-elevated relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    >
      {(eyebrow || title || actions) && (
        <header className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {eyebrow && <div className="reference-eyebrow eyebrow mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</div>}
            {title && <h2 className="reference-section-title font-display text-lg font-bold text-card-foreground">{title}</h2>}
            {description && <p className="reference-muted-copy mt-1 text-sm font-medium text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  )
}
