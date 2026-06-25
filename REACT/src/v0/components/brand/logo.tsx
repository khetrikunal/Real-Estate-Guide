import { cn } from "@/lib/utils"

export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-primary" />
      {/* Building outline icon like the reference */}
      <path
        d="M7 23V12l5-4 5 4v4l4-3 3 3v7H7Z"
        className="fill-primary-foreground"
        opacity="0.9"
      />
      <rect x="13" y="17" width="3" height="6" className="fill-primary" rx="0.5" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logomark className="h-8 w-8" />
      <div className="flex flex-col leading-none">
        <span className="text-[14px] font-bold tracking-tight">RealEstate</span>
        <span className="text-[9px] font-semibold tracking-[0.22em] text-[var(--brand-gold)] uppercase">— Guide —</span>
      </div>
    </div>
  )
}
