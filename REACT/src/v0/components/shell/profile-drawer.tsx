"use client"

import { Mail, Phone, Shield, CalendarDays, Pencil, KeyRound, LogOut, X } from "lucide-react"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import { useAppReducedMotion } from "@app/motion"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@app/auth/AuthContext"
import { ROLES, type RoleKey } from "@/lib/roles"
import { Separator } from "@/components/ui/separator"

interface ProfileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RoleKey
}

export function ProfileDrawer({ open, onOpenChange, role }: ProfileDrawerProps) {
  const roleDef = ROLES[role]
  const { logout, user } = useAuth()
  const reduceMotion = useAppReducedMotion()
  const backdropTransition: Transition = reduceMotion ? { duration: 0.001 } : { duration: 0.16, ease: "easeOut" }
  const drawerTransition: Transition = reduceMotion ? { duration: 0.001 } : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }
  const handleLogout = async () => {
    await logout()
    onOpenChange(false)
    window.location.assign(`/login/${role}`)
  }

  const displayName = (user as any)?.name ?? (user as any)?.username ?? "User"
  const email = (user as any)?.email ?? "admin@realestate-guide.com"
  const phone = (user as any)?.phone ?? (user as any)?.mobile ?? "—"
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U"

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
                <AvatarFallback className="bg-amber-50 text-base font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold tracking-tight">{displayName}</div>
                <div className="text-sm text-muted-foreground">{roleDef.label}</div>
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
              <Row icon={<Shield className="h-4 w-4" />} label="Role" value={roleDef.label} />
              <Row icon={<CalendarDays className="h-4 w-4" />} label="Member since" value="23 Apr 2026" />
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
