"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"
import { AppSidebar } from "./app-sidebar"
import { AppTopbar } from "./app-topbar"
import { CommandPalette } from "./command-palette"
import { ProfileDrawer } from "./profile-drawer"
import type { RoleKey } from "@/lib/roles"
import { cn } from "@/lib/utils"

interface AppShellProps {
  role: RoleKey
  children: React.ReactNode
  hideTopbar?: boolean
}

export function AppShell({ role, children, hideTopbar = false }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const location = useLocation()

  return (
    <div
      className={cn(
        "reference-shell app-shell flex h-svh w-full overflow-hidden bg-background",
        hideTopbar && "reference-shell--immersive",
      )}
    >
      <AppSidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenCommand={() => setCmdOpen(true)}
      />
      <div className="reference-content flex min-w-0 flex-1 flex-col">
        {!hideTopbar && (
          <AppTopbar role={role} onOpenCommand={() => setCmdOpen(true)} onOpenProfile={() => setProfileOpen(true)} />
        )}
        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="animate-in-up" data-click-spark-scope="off">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} role={role} />
      <ProfileDrawer open={profileOpen} onOpenChange={setProfileOpen} role={role} />
    </div>
  )
}
