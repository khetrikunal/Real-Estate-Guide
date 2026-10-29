import type * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Empty className={cn('workspace-empty gap-4', className)}>
      <EmptyHeader className="gap-2">
        {Icon && <EmptyMedia variant="icon" className="size-10 rounded-xl bg-primary/5 text-primary/55 ring-1 ring-border"><Icon className="size-5" strokeWidth={1.4} /></EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
