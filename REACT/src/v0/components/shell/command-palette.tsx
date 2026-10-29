"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import { useAppReducedMotion } from "@app/motion"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,

} from "@/components/ui/command"
import { navSectionsForRole } from "@/lib/nav"
import { type RoleKey } from "@/lib/roles"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RoleKey
}

export function CommandPalette({ open, onOpenChange, role }: CommandPaletteProps) {
  const router = useRouter()
  const reduceMotion = useAppReducedMotion()
  const navSections = React.useMemo(() => navSectionsForRole(role), [role])
  const backdropTransition: Transition = reduceMotion ? { duration: 0.001 } : { duration: 0.16, ease: "easeOut" }
  const panelTransition: Transition = reduceMotion ? { duration: 0.001 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <>
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
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Command search"
        description="Jump to any tool"
        className="reference-command-panel data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:duration-0"
      >
        <Command>
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4, scale: 0.99 }}
          transition={panelTransition}
        >
          <CommandInput placeholder="Search tools, properties, leads, locations…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {navSections.map((section) => (
              <CommandGroup key={section.label} heading={section.label}>
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem key={item.key} onSelect={() => go(item.href(role))}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </motion.div>
        </Command>
      </CommandDialog>
    </>
  )
}
