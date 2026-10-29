import * as React from "react"
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  trend?: { value: number; label?: string } | null
  tone?: "default" | "primary" | "success" | "warning" | "info" | "danger"
  className?: string
}

const toneMap = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  danger: "text-destructive",
} as const

const iconBgMap = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  danger: "bg-destructive/15 text-destructive",
} as const

export function StatCard({ label, value, hint, icon: Icon, trend, tone = "default", className }: StatCardProps) {
  const trendUp = trend && trend.value >= 0
  return (
    <Card
      className={cn(
        "reference-stat-card workspace-stat-card group relative overflow-hidden gap-0 py-0 ring-0 border border-border p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow">{label}</div>
        {Icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBgMap[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={cn("mt-4 font-mono text-3xl font-bold tabular", toneMap[tone])}>
        {value}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
        {trend && (
          <div
            className={cn(
              "ml-auto inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              trendUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{Math.abs(trend.value)}%</span>
            {trend.label && <span className="ml-0.5 text-muted-foreground">{trend.label}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}
