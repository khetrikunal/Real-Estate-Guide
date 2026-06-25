"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type WizardStep = {
  key: string
  label: string
}

export function WizardStepper({
  steps,
  currentKey,
  completedKeys,
}: {
  steps: WizardStep[]
  currentKey: string
  completedKeys: Set<string>
}) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {steps.map((step, idx) => {
          const isCurrent = step.key === currentKey
          const isCompleted = completedKeys.has(step.key)

          return (
            <li key={step.key} className="relative">
              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-background/40 p-3",
                  isCurrent && "border-primary/40 bg-primary/5",
                  isCompleted && !isCurrent && "border-primary/20 bg-primary/10",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                    isCompleted
                      ? "border-primary/60 bg-primary text-background"
                      : isCurrent
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div className="min-w-0">
                  <div className={cn("text-xs font-semibold uppercase tracking-wider", isCurrent && "text-primary")}>{step.label}</div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

