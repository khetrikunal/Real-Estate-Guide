import type * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/10 opacity-30" />
        </div>
      )}
      <div className="text-base font-semibold tracking-tight">{title}</div>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
