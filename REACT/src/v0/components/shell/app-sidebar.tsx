"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsLeft, ChevronsRight, LogOut, RefreshCcw, Search } from "lucide-react"

import { motion } from "framer-motion"
import { useAppReducedMotion } from "@app/motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@app/auth/AuthContext"
import { Logomark } from "@/components/brand/logo"
import { navSectionsForRole } from "@/lib/nav"
import { ROLES, type RoleKey } from "@/lib/roles"

interface AppSidebarProps {
  role: RoleKey
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenProfile: () => void
  onOpenCommand: () => void
}

export function AppSidebar({ role, collapsed, onToggleCollapsed, onOpenProfile, onOpenCommand }: AppSidebarProps) {
  const pathname = usePathname()
  const roleDef = ROLES[role]
  const { logout } = useAuth()
  const reduceMotion = useAppReducedMotion()
  const navSections = React.useMemo(() => navSectionsForRole(role), [role])
  const handleLogout = async () => {
    await logout()
    window.location.assign(`/login/${role}`)
  }

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          "reference-sidebar group/sidebar relative flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          "transition-[width] duration-300 ease-out",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="relative">
            <Logomark className="h-8 w-8" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-bold tracking-tight">RealEstate</span>
              <span className="truncate text-[8px] font-semibold tracking-[0.2em] text-[#c9a84c] uppercase">
                — Guide — · {roleDef.label}
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapsed}
            className={cn(
              "ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,opacity,transform]",
              "hover:bg-sidebar-accent hover:text-sidebar-foreground active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              collapsed && "ml-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>



        {/* Nav sections */}
        <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
          {navSections.map((section) => (
            <div key={section.label} className="py-2">
              {!collapsed && <div className="eyebrow px-2.5 pb-1.5">{section.label}</div>}
              {collapsed && (
                <div className="my-2 h-px w-full bg-sidebar-border first:hidden" aria-hidden="true" />
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const href = item.href(role)
                  const active = pathname === href || pathname?.startsWith(href + "/")
                  const Icon = item.icon
                  const link = (
                    <Link
                      href={href}
                      data-active={active ? "true" : undefined}
                      className={cn(
                        "group/item relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-[background-color,color,opacity,transform]",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        "active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {active && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r bg-primary"
                          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -2 }}
                          transition={reduceMotion ? { duration: 0.001 } : { duration: 0.16, ease: "easeOut" }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground",
                        )}
                      />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </Link>
                  )
                  return (
                    <li key={item.key}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User card + actions */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={onOpenProfile}
            className={cn(
              "group/user flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-[background-color,border-color,color,opacity,transform]",
              "hover:border-sidebar-border hover:bg-sidebar-accent/60 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              collapsed && "justify-center p-1.5",
            )}
            data-click-spark="true"
          >
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">SU</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-semibold">Sherry User</span>
                <span className="truncate text-[11px] text-muted-foreground">{roleDef.label}</span>
              </div>
            )}
          </button>

          {!collapsed && (
            <div className="mt-2 flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href="/roles">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      <span className="sr-only">Change role</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Change role</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label="Logout"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="sr-only">Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            </div>
          )}

          {collapsed && (
            <div className="mt-2 flex flex-col gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-full">
                    <Link href="/roles">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      <span className="sr-only">Change role</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Change role</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-full text-destructive hover:text-destructive"
                    aria-label="Logout"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="sr-only">Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </div>
          )}

        </div>
      </aside>
    </TooltipProvider>
  )
}
