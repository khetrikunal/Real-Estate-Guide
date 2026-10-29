import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardContent } from '@/components/ui/card'

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
    <Card
      className={cn(
        "workspace-section-card reference-section relative overflow-hidden gap-0 py-0 ring-0 border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    >
      {(eyebrow || title || actions) && (
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <div className="reference-eyebrow eyebrow mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</div>}
            {title && <h2 className="reference-section-title font-display text-lg font-bold text-card-foreground">{title}</h2>}
            {description && <p className="reference-muted-copy mt-1 text-sm font-medium text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
