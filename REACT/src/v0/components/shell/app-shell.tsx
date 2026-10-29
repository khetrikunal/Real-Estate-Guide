"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"
import { AppSidebar } from "./app-sidebar"
import { AppTopbar } from "./app-topbar"
import { CommandPalette } from "./command-palette"
import { ProfileDrawer } from "./profile-drawer"
import type { RoleKey } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'

interface AppShellProps {
  role: RoleKey
  children: React.ReactNode
  hideTopbar?: boolean
}

export function AppShell({ role, children, hideTopbar = false }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(() => window.matchMedia('(max-width: 760px)').matches)
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const location = useLocation()

  React.useEffect(() => {
    const mobile = window.matchMedia('(max-width: 760px)')
    const onChange = () => setCollapsed(mobile.matches)
    mobile.addEventListener('change', onChange)
    return () => mobile.removeEventListener('change', onChange)
  }, [])

  return (
    <div
      className={cn(
        "workspace-shell reference-shell app-shell flex h-svh w-full overflow-hidden bg-background",
        hideTopbar && "reference-shell--immersive",
      )}
    >
      <div className="workspace-desktop-navigation"><AppSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenCommand={() => setCmdOpen(true)}
      /></div>
      <div className="reference-content flex min-w-0 flex-1 flex-col">
        {!hideTopbar && (
          <AppTopbar role={role} onOpenCommand={() => setCmdOpen(true)} onOpenProfile={() => setProfileOpen(true)} onOpenMobile={() => setMobileOpen(true)} />
        )}
        <main className="workspace-main flex-1 overflow-y-auto">
          <div key={location.pathname} className="animate-in-up" data-click-spark-scope="off">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} role={role} />
      <ProfileDrawer open={profileOpen} onOpenChange={setProfileOpen} role={role} />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="workspace-nav-sheet p-0"><SheetTitle className="sr-only">Workspace navigation</SheetTitle><SheetDescription className="sr-only">Open a tool in your real estate workspace.</SheetDescription><AppSidebar mobile role={role} collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} onOpenProfile={() => { setMobileOpen(false); setProfileOpen(true) }} onOpenCommand={() => { setMobileOpen(false); setCmdOpen(true) }} onNavigate={() => setMobileOpen(false)} /></SheetContent></Sheet>
    </div>
  )
}
