"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import type { RoleKey } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import { useAuth } from "@app/auth/AuthContext"

interface AppTopbarProps {
  role: RoleKey
  onOpenCommand: () => void
  onOpenProfile: () => void
}

export function AppTopbar({ role, onOpenCommand, onOpenProfile }: AppTopbarProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const userId = auth.user?.id
  const shouldCheckSubscription = role === "subadmin" && !!userId
  const subscriptionStatusQ = useQuery({
    queryKey: userId ? queryKeys.subscription.status(userId) : queryKeys.subscription.all,
    queryFn: () => userId ? estateApi.subscription.status(userId) : Promise.resolve(true),
    enabled: shouldCheckSubscription,
  })
  const subscriptionDetailQ = useQuery({
    queryKey: userId ? queryKeys.subscription.detail(userId) : queryKeys.subscription.all,
    queryFn: () => userId ? estateApi.subscription.detail(userId) : Promise.resolve({}),
    enabled: shouldCheckSubscription,
  })
  const subscriptionWarning = subscriptionWarningText(auth.user, subscriptionDetailQ.data, subscriptionStatusQ.data)

  return (
    <header
      className={cn(
        "reference-topbar sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md",
      )}
    >
      <div className="min-w-0 flex-1">
        {subscriptionWarning && (
          <button
            type="button"
            onClick={() => navigate("/subadmin/subscription")}
            className="inline-flex max-w-full items-center gap-2 rounded-md border border-red-500/30 bg-red-500/8 px-3 py-1.5 text-left text-[11px] font-semibold text-red-600 transition-[background-color,border-color,color] hover:border-red-400/50 hover:bg-red-500/12 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/45 dark:text-red-300 dark:hover:text-red-200"
            title={subscriptionWarning}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{subscriptionWarning}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 transition-[background-color,color,opacity,transform] hover:-translate-y-0.5 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
        </Button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-amber-300/40 bg-amber-50 text-xs font-bold text-amber-800 transition-[background-color,border-color,color,opacity,transform] hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-amber-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 sm:flex dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
          aria-label="Open profile drawer"
          data-click-spark="true"
        >
          {(auth.user as any)?.name?.charAt(0)?.toUpperCase() ?? (auth.user as any)?.username?.charAt(0)?.toUpperCase() ?? "U"}
        </button>
      </div>
    </header>
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function parseDate(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function subscriptionWarningText(user: unknown, detail: unknown, activeStatus: unknown) {
  const userRecord = asRecord(user)
  const detailRecord = asRecord(detail)
  const subscription = asRecord(detailRecord.subscription)
  const expiry = parseDate(subscription.endDate ?? userRecord.subscriptionExpiresAt ?? userRecord.planExpiry ?? userRecord.expiryDate)
  if (!expiry) {
    return activeStatus === false ? "Subscription expired. Pay again to unlock services." : ""
  }
  const daysRemaining = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysRemaining < 0) return "Subscription expired. Pay again to unlock services."
  if (daysRemaining <= 3) {
    return `Subscription ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Pay again for continuity of services.`
  }
  return ""
}
