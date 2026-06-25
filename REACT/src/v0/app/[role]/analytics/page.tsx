"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, BarChart3, Building2, ReceiptIndianRupee, TrendingUp, Users } from "lucide-react"

import { estateApi } from "@app/api/estateApi"
import { useAuth } from "@app/auth/AuthContext"
import { PageContainer, PageHeader } from "@/components/shell/page-header"
import { SectionCard } from "@/components/shell/section-card"
import { StatCard } from "@/components/shell/stat-card"
import { StatusPill } from "@/components/shell/status-pill"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnimatedRows, OperationalKpiGroup, PanelTransition, RevealSection } from "@/motion"
import { useProjectsData, useSalesData } from "@/lib/live-data"

type ApiRecord = Record<string, unknown>

type MonthlyRevenue = {
  month: string
  revenue: number
}

type PerformancePoint = {
  series: string
  period: string
  unitsSold: number
}

const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

export default function AnalyticsPage() {
  const auth = useAuth()
  const { projects } = useProjectsData()
  const { sales } = useSalesData()
  const enabled = auth.ready && Boolean(auth.token)

  const dashboardStats = useQuery({
    queryKey: ["v0", "analytics", "dashboard-stats", auth.role],
    queryFn: () => estateApi.dashboard.stats(),
    enabled,
    staleTime: 15_000,
  })
  const salesAnalytics = useQuery({
    queryKey: ["v0", "analytics", "sales-analytics", auth.role],
    queryFn: () => estateApi.sales.analytics(),
    enabled,
    refetchInterval: 10_000,
  })
  const salesPerformance = useQuery({
    queryKey: ["v0", "analytics", "sales-performance", auth.role],
    queryFn: () => estateApi.sales.performanceFiltered({ range: "30d", groupBy: "seller" }),
    enabled,
    refetchInterval: 10_000,
  })
  const leadsQuery = useQuery({
    queryKey: ["v0", "analytics", "leads", auth.role],
    queryFn: async () => asArray(await estateApi.leads.list()),
    initialData: [],
    enabled,
    staleTime: 10_000,
  })
  const usersQuery = useQuery({
    queryKey: ["v0", "analytics", "users", auth.role],
    queryFn: () => loadAnalyticsUsers(auth.role),
    initialData: [],
    enabled,
    staleTime: 30_000,
  })

  const statsRecord = asRecord(dashboardStats.data)
  const salesRecord = asRecord(salesAnalytics.data)
  const monthlyRevenue = normalizeMonthlySales(salesRecord.monthlySales)
  const performanceRows = normalizePerformance(salesPerformance.data)
  const users = usersQuery.data ?? []
  const leads = leadsQuery.data ?? []

  const metrics = useMemo(() => {
    const revenue = numberField(statsRecord, "revenue", "totalRevenue") || numberField(salesRecord, "totalSales")
    const team =
      numberField(statsRecord, "totalAdmins") +
      numberField(statsRecord, "totalSubAdmins") +
      numberField(statsRecord, "totalEmployees") ||
      users.length
    const soldUnits = projects.reduce((sum, project) => sum + (project.unitsSold || 0), 0)
    const totalProjects = numberField(statsRecord, "totalProjects", "activeProjects") || projects.length
    const activeProjects = numberField(statsRecord, "activeProjects") || projects.filter((project) => project.status === "active").length
    const totalSales = numberField(statsRecord, "totalSales") || numberField(salesRecord, "totalTransactions") || sales.length
    const leadGroups = {
      new: leads.filter((lead) => normalizedLeadStatus(lead) === "NEW").length,
      contacted: leads.filter((lead) => normalizedLeadStatus(lead) === "CONTACTED").length,
      interested: leads.filter((lead) => normalizedLeadStatus(lead) === "INTERESTED").length,
      closed: leads.filter((lead) => normalizedLeadStatus(lead) === "CLOSED").length,
    }

    return {
      revenue,
      team,
      soldUnits,
      activeProjects,
      totalProjects,
      totalSales,
      leadGroups,
    }
  }, [leads, projects, sales.length, salesRecord, statsRecord, users.length])

  const overviewRows = [
    { label: "Total revenue", value: formatInr(metrics.revenue), tone: "success" as const },
    { label: "Transactions", value: String(metrics.totalSales), tone: "primary" as const },
    { label: "Projects", value: String(metrics.totalProjects), tone: "info" as const },
    { label: "Active inventory", value: String(metrics.activeProjects), tone: "warning" as const },
    { label: "Units sold", value: String(metrics.soldUnits), tone: "primary" as const },
    { label: "Team strength", value: String(metrics.team), tone: "success" as const },
  ]

  const teamRows = useMemo(() => {
    const direct = {
      admins: users.filter((user) => normalizedUserRole(user).includes("ADMIN") && !normalizedUserRole(user).includes("SUB")).length,
      subAdmins: users.filter((user) => normalizedUserRole(user).includes("SUB")).length,
      employees: users.filter((user) => normalizedUserRole(user).includes("EMPLOYEE")).length,
    }
    return {
      admins: direct.admins || numberField(statsRecord, "totalAdmins"),
      subAdmins: direct.subAdmins || numberField(statsRecord, "totalSubAdmins"),
      employees: direct.employees || numberField(statsRecord, "totalEmployees"),
    }
  }, [statsRecord, users])

  const isRefreshing =
    dashboardStats.isFetching ||
    salesAnalytics.isFetching ||
    salesPerformance.isFetching ||
    leadsQuery.isFetching ||
    usersQuery.isFetching

  return (
    <PageContainer className="max-w-[1560px] py-5">
      <div className="reference-page-panel px-10 py-10">
        <PageHeader
          eyebrow="Insights"
          title="Analytics"
          description="Read portfolio momentum, lead funnel health, and recent revenue at a glance."
          actions={
            <Button variant="outline" className="gap-1.5 transition-transform active:scale-[0.98]">
              <ArrowRight className="h-4 w-4" />
              Export summary
            </Button>
          }
        />

        <OperationalKpiGroup className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue" value={formatInr(metrics.revenue)} icon={ReceiptIndianRupee} tone="success" hint="Closed deals" />
          <StatCard label="Sales" value={String(metrics.totalSales)} icon={TrendingUp} tone="primary" hint="Transactions" />
          <StatCard label="Projects" value={String(metrics.totalProjects)} icon={Building2} tone="info" hint={`${metrics.activeProjects} active`} />
          <StatCard label="Team" value={String(metrics.team)} icon={Users} tone="warning" hint={`${leads.length} live leads`} />
        </OperationalKpiGroup>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <RevealSection>
            <SectionCard eyebrow="Overview" title="Portfolio snapshot" contentClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overviewRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.value}</TableCell>
                      <TableCell>
                        <StatusPill tone={row.tone}>{row.tone === "success" ? "Healthy" : row.tone === "warning" ? "Watch" : "Live"}</StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </RevealSection>

          <PanelTransition>
            <SectionCard eyebrow="Lead funnel" title="Conversion pulse">
              <AnimatedRows className="grid gap-3">
                <FunnelRow label="New leads" value={metrics.leadGroups.new} accent="bg-primary/15 text-primary" />
                <FunnelRow label="Contacted" value={metrics.leadGroups.contacted} accent="bg-secondary text-secondary-foreground" />
                <FunnelRow label="Interested" value={metrics.leadGroups.interested} accent="bg-accent text-accent-foreground" />
                <FunnelRow label="Closed" value={metrics.leadGroups.closed} accent="bg-muted text-muted-foreground" />
              </AnimatedRows>
            </SectionCard>
          </PanelTransition>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <RevealSection>
            <SectionCard eyebrow="Revenue" title="Monthly sales" contentClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRevenue.filter((row) => row.revenue > 0).slice(-6).map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell>{formatInr(row.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {monthlyRevenue.every((row) => row.revenue <= 0) ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">No monthly sales returned.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </SectionCard>
          </RevealSection>

          <PanelTransition>
            <SectionCard eyebrow="Coverage" title="Team distribution">
              <AnimatedRows className="grid gap-3">
                <CoverageRow label="Admins" value={teamRows.admins} icon={Users} />
                <CoverageRow label="Sub Admins" value={teamRows.subAdmins} icon={BarChart3} />
                <CoverageRow label="Employees" value={teamRows.employees} icon={TrendingUp} />
              </AnimatedRows>
            </SectionCard>
          </PanelTransition>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <RevealSection>
            <SectionCard eyebrow="Recent deals" title="Sales ledger" contentClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.slice(0, 6).map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.project}</TableCell>
                      <TableCell>{sale.config}</TableCell>
                      <TableCell>{sale.buyer ?? "-"}</TableCell>
                      <TableCell>{sale.amount}</TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">No sales records returned.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </SectionCard>
          </RevealSection>

          <PanelTransition>
            <SectionCard eyebrow="Performance" title="Units sold by period" contentClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceRows.slice(0, 8).map((row) => (
                    <TableRow key={`${row.series}-${row.period}`}>
                      <TableCell className="font-medium">{row.series}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.unitsSold}</TableCell>
                    </TableRow>
                  ))}
                  {performanceRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">No performance points returned.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </SectionCard>
          </PanelTransition>
        </div>

        {isRefreshing ? <p className="mt-4 text-xs text-muted-foreground">Refreshing live analytics...</p> : null}
      </div>
    </PageContainer>
  )
}

function FunnelRow({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="surface-elevated border-border flex items-center justify-between rounded-2xl border px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={`inline-flex min-w-12 justify-center rounded-full px-3 py-1 text-sm font-semibold ${accent}`}>
        {value}
      </span>
    </div>
  )
}

async function loadAnalyticsUsers(role: string) {
  const calls =
    role === "admin"
      ? [estateApi.users.admin.subadmins(), estateApi.users.admin.employees()]
      : role === "superadmin"
        ? [
            estateApi.users.superadmin.admins(),
            estateApi.users.superadmin.subadmins(),
            estateApi.users.superadmin.employees(),
          ]
        : []
  if (!calls.length) return []
  const results = await Promise.allSettled(calls)
  return results.flatMap((result) => result.status === "fulfilled" ? asArray(result.value) : [])
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ApiRecord : {}
}

function asArray(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is ApiRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
  const record = asRecord(value)
  const nested = record.data ?? record.content ?? record.items ?? record.results ?? record.records ?? record.users
  return Array.isArray(nested)
    ? nested.filter((item): item is ApiRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : []
}

function numberField(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function stringField(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

function normalizeMonthlySales(value: unknown): MonthlyRevenue[] {
  const rows = asArray(value)
  return rows.map((row) => ({
    month: monthName(numberField(row, "month")) || stringField(row, "label", "name") || "-",
    revenue: numberField(row, "total", "totalSales", "revenue", "amount"),
  }))
}

function normalizePerformance(value: unknown): PerformancePoint[] {
  const record = asRecord(value)
  const series = asArray(record.series)
  return series.flatMap((entry, seriesIndex) => {
    const name = stringField(entry, "name", "seller", "role") || `Series ${seriesIndex + 1}`
    return asArray(entry.points).map((point, pointIndex) => ({
      series: name,
      period: stringField(point, "label", "period", "date") || `Point ${pointIndex + 1}`,
      unitsSold: numberField(point, "unitsSold", "sales", "transactions"),
    }))
  })
}

function normalizedLeadStatus(lead: ApiRecord) {
  return stringField(lead, "status", "leadStatus").toUpperCase().replace(/[\s-]/g, "_")
}

function normalizedUserRole(user: ApiRecord) {
  return stringField(user, "role", "userRole").toUpperCase().replace(/[\s-]/g, "_")
}

function monthName(month: number) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return month >= 1 && month <= 12 ? labels[month - 1] : ""
}

function CoverageRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Users
}) {
  return (
    <div className="surface-elevated border-border flex items-center gap-3 rounded-2xl border px-4 py-3">
      <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">Active contributors</div>
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}
