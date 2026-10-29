"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import type { RoleKey } from "@/lib/roles"
import { estateApi } from "@app/api/estateApi"
import { queryKeys } from "@app/api/queryKeys"
import { useAuth } from "@app/auth/AuthContext"

import { WorkspaceTopbar } from './workspace-topbar'
interface AppTopbarProps {
  role: RoleKey
  onOpenCommand: () => void
  onOpenMobile?: () => void
  onOpenProfile: () => void
}

export function AppTopbar({ role, onOpenCommand, onOpenProfile, onOpenMobile }: AppTopbarProps) {
  const auth = useAuth()

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

  return <WorkspaceTopbar role={role} onOpenCommand={onOpenCommand} onOpenProfile={onOpenProfile} onOpenMobile={onOpenMobile} subscriptionWarning={subscriptionWarning} />;
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
