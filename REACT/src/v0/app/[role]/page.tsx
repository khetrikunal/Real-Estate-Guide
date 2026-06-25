import { redirect } from "next/navigation"

export default async function RoleIndex({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  redirect(`/${role}/followup`)
}
