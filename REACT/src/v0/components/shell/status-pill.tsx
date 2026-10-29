import { cn } from "@/lib/utils"
import { Badge } from '@/components/ui/badge'

type Tone = "neutral" | "primary" | "success" | "warning" | "info" | "danger"

  const map: Record<Tone, string> = {
  neutral: "bg-muted/60 text-muted-foreground border-border",
  primary: "bg-primary/12 text-primary border-primary/20",
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  info: "bg-info/10 text-info border-info/20",
  danger: "bg-destructive/15 text-destructive border-destructive/25",
}


export function StatusPill({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: Tone
  dot?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        map[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-muted-foreground": tone === "neutral",
            "bg-primary": tone === "primary",
            "bg-success": tone === "success",
            "bg-warning": tone === "warning",
            "bg-info": tone === "info",
            "bg-destructive": tone === "danger",
          })}
        />
      )}
      {children}
    </Badge>
  )
}
