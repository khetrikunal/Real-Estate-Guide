import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("workspace-page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="reference-eyebrow eyebrow mb-2">{eyebrow}</div>}
        <h1 className="reference-page-title font-display text-3xl font-bold text-balance sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="reference-body-copy animate-in-fade mt-2 max-w-2xl text-sm font-medium text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("reference-page-container w-full max-w-none px-6 py-6 lg:px-8", className, "max-w-none")}>{children}</div>
  )
}
