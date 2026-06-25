import { notFound } from "next/navigation"
import { AppShell } from "@/components/shell/app-shell"
import { ROLE_ORDER, type RoleKey } from "@/lib/roles"

export default async function RoleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ role: string }>
}) {
  const { role } = await params
  if (!ROLE_ORDER.includes(role as RoleKey)) notFound()

  return <AppShell role={role as RoleKey}>{children}</AppShell>
}
