"use client"

import * as React from "react"
import { Mail, Phone, Shield, CalendarDays, Pencil, KeyRound, LogOut, X } from "lucide-react"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import { useAppReducedMotion } from "@app/motion"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@app/auth/AuthContext"
import { roleFromUser } from "@app/coverage/features"
import { ROLES, type RoleKey } from "@/lib/roles"
import { Separator } from "@/components/ui/separator"

interface ProfileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RoleKey
}

export function ProfileDrawer({ open, onOpenChange, role }: ProfileDrawerProps) {
  const roleDef = ROLES[role]
  const { logout, user, role: authRole } = useAuth()
  const reduceMotion = useAppReducedMotion()
  const backdropTransition: Transition = reduceMotion ? { duration: 0.001 } : { duration: 0.16, ease: "easeOut" }
  const drawerTransition: Transition = reduceMotion ? { duration: 0.001 } : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }
  const handleLogout = async () => {
    await logout()
    onOpenChange(false)
    window.location.assign(`/login/${role}`)
  }

  const userRoleKey = roleFromUser(user?.role ?? (user as any)?.userRole ?? authRole, role)
  const userRoleLabel = ROLES[userRoleKey]?.label ?? roleDef.label
  const displayName =
    user?.name?.trim() ||
    user?.fullName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User"
  const email = user?.email?.trim() || "—"
  const phone = user?.phone?.trim() || (user as any)?.mobile?.trim() || "—"
  const profilePhotoUrl =
    typeof (user as any)?.profilePhotoUrl === "string" && (user as any).profilePhotoUrl
      ? (user as any).profilePhotoUrl
      : undefined
  const memberSince = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Active session"

  const initials = React.useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "U"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [displayName])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 bg-black/10"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: reduceMotion ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
          />
        ) : null}
      </AnimatePresence>
      <SheetContent
        side="right"
        className="reference-profile-drawer w-full p-0 data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:duration-0 sm:max-w-md [&>button]:hidden"
      >
        <motion.div
          className="flex min-h-0 flex-1 flex-col"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
          transition={drawerTransition}
        >
          <SheetHeader className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Profile</SheetTitle>
            </div>
          </SheetHeader>


          <div className="flex flex-col gap-6 px-6 py-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-amber-200 dark:ring-amber-700/50">
                {profilePhotoUrl ? (
                  <AvatarImage src={profilePhotoUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-amber-50 text-base font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold tracking-tight">{displayName}</div>
                <div className="text-sm text-muted-foreground">{userRoleLabel}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Active session
                </div>
              </div>
            </div>

            <Separator />

            {/* Fields */}
            <dl className="flex flex-col gap-4">
              <Row icon={<Mail className="h-4 w-4" />} label="Email" value={email} />
              <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={phone} />
              <Row icon={<Shield className="h-4 w-4" />} label="Role" value={userRoleLabel} />
              <Row icon={<CalendarDays className="h-4 w-4" />} label="Member since" value={memberSince} />
            </dl>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="justify-start gap-2">
                <Pencil className="h-4 w-4" />
                Edit profile
              </Button>
              <Button variant="secondary" className="justify-start gap-2">
                <KeyRound className="h-4 w-4" />
                Change password
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-2 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  )
}
