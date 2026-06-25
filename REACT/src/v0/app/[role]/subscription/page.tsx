"use client"

import { use, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, Loader2, ReceiptIndianRupee, RefreshCw } from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatCard } from "@/components/shell/stat-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Button } from "@/components/ui/button"
import { useUsersData } from "@/lib/live-data"
import { OperationalKpiGroup, PanelTransition, RevealSection } from "@/motion"

type OrderRow = {
  id: string
  broker: string
  plan: string
  amount: number
  status: "created" | "verified" | "pending"
  orderId: string
}

const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)

type RoleParams = { role: string } | Promise<{ role: string }>

function isPromiseParams(params: RoleParams): params is Promise<{ role: string }> {
  return typeof (params as Promise<{ role: string }>).then === "function"
}

export default function SubscriptionPage({ params }: { params: RoleParams }) {
  const { role } = isPromiseParams(params) ? use(params) : params
  return <SubscriptionContent role={role} />
}

function SubscriptionContent({ role }: { role: string }) {
  const { subAdmins } = useUsersData()
  const [orders, setOrders] = useState<OrderRow[]>([])

  const rows = useMemo<OrderRow[]>(() => {
    if (orders.length) return orders
    const source = subAdmins.length ? subAdmins : []
    return source.slice(0, 8).map((user, index) => ({
      id: user.id,
      broker: user.name,
      plan: index % 2 === 0 ? "Premium" : "Standard",
      amount: index % 2 === 0 ? 25000 : 12000,
      status: user.active ? "verified" : "pending",
      orderId: user.active ? `order_${user.id}` : "-",
    }))
  }, [orders, subAdmins])

  const createOrder = useMutation({
    mutationFn: async (row: OrderRow) => estateApi.payments.createOrder({ subadminId: row.id, amount: row.amount, planType: row.plan }),
    onSuccess: (result, row) => {
      const record = result && typeof result === "object" ? (result as Record<string, unknown>) : {}
      const orderId = String(record.orderId ?? record.id ?? `order_${row.id}`)
      setOrders((current) =>
        (current.length ? current : rows).map((item) =>
          item.id === row.id ? { ...item, status: "created", orderId } : item,
        ),
      )
    },
  })

  const verifyOrder = useMutation({
    mutationFn: async (row: OrderRow) =>
      estateApi.payments.verify({ subadminId: row.id, orderId: row.orderId, amount: row.amount, planType: row.plan }),
    onSuccess: (_result, row) => {
      setOrders((current) =>
        (current.length ? current : rows).map((item) =>
          item.id === row.id ? { ...item, status: "verified" } : item,
        ),
      )
    },
  })

  const revenue = rows.reduce((sum, row) => sum + (row.status === "verified" ? row.amount : 0), 0)
  const pending = rows.filter((row) => row.status !== "verified").length

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Subscription"
        title={role === "superadmin" ? "Order summary" : "Subscription status"}
        description="Review broker subscription orders, verification state, and retry payment actions."
        actions={
          <Button type="button" size="sm" variant="secondary" className="gap-1.5 transition-transform active:scale-[0.98]" onClick={() => setOrders([])}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <OperationalKpiGroup className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Verified revenue" value={formatInr(revenue)} icon={ReceiptIndianRupee} tone="primary" hint="Paid orders" />
        <StatCard label="Orders" value={String(rows.length)} icon={ReceiptIndianRupee} tone="default" hint="Current summary" />
        <StatCard label="Pending" value={String(pending)} icon={CheckCircle2} tone="warning" hint="Needs verification" />
      </OperationalKpiGroup>

      <RevealSection className="mt-8">
      <SectionCard eyebrow={`${rows.length} orders`} title="Payment order summary">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-[11px] font-medium uppercase tracking-wider">
                <th className="py-3 text-left">Broker</th>
                <th className="py-3 text-left">Plan</th>
                <th className="py-3 text-left">Order ID</th>
                <th className="py-3 text-right">Amount</th>
                <th className="py-3 text-left">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-medium">{row.broker}</td>
                  <td className="py-3">{row.plan}</td>
                  <td className="py-3 font-mono text-xs">{row.orderId}</td>
                  <td className="py-3 text-right font-mono text-xs tabular-nums">{formatInr(row.amount)}</td>
                  <td className="py-3">
                    <StatusPill tone={row.status === "verified" ? "success" : row.status === "created" ? "info" : "warning"} dot>
                      {row.status}
                    </StatusPill>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="transition-transform active:scale-[0.98]"
                        disabled={createOrder.isPending}
                        onClick={() => createOrder.mutate(row)}
                      >
                        {createOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : null}
                        Create order
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="transition-transform active:scale-[0.98]"
                        disabled={verifyOrder.isPending || row.orderId === "-"}
                        onClick={() => verifyOrder.mutate(row)}
                      >
                        {verifyOrder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : null}
                        Verify
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <PanelTransition motionKey="subscription-empty">
              <div className="py-12 text-center text-sm text-muted-foreground">No subscription orders found.</div>
            </PanelTransition>
          ) : null}
        </div>
      </SectionCard>
      </RevealSection>
    </PageContainer>
  )
}
