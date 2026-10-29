import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ArrowRight, ArrowUpRight, BarChart3, Building2, CalendarDays, CalendarClock, CircleDollarSign, Clock3, MapPin, Plus, RefreshCw, Target, TrendingUp, Users } from 'lucide-react';
import { estateApi } from '@app/api/estateApi';
import { useAuth } from '@app/auth/AuthContext';
import { useFollowUpsData, useLeadsData, useProjectsData } from '@/lib/live-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { StatCard } from '@/components/shell/stat-card';
import { EmptyState } from '@/components/shell/empty-state';
import { StatusPill } from '@/components/shell/status-pill';
import { RevealSection } from '@app/motion';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const numeric = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: value >= 10000000 ? 'compact' : 'standard' }).format(value);

export default function OverviewPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const role = auth.role;
  const [months, setMonths] = useState('6');
  const { projects, isFetching: projectsFetching, error: projectsError } = useProjectsData();
  const { leads, isFetching: leadsFetching } = useLeadsData();
  const { followUps } = useFollowUpsData();
  const stats = useQuery({ queryKey: ['v0', 'overview', 'stats', role], queryFn: () => estateApi.dashboard.stats(), enabled: auth.ready && !!auth.token, staleTime: 15000 });
  const sales = useQuery({ queryKey: ['v0', 'overview', 'sales', role], queryFn: () => estateApi.sales.analytics(), enabled: auth.ready && !!auth.token, staleTime: 15000 });
  const statistics = record(stats.data);
  const revenue = numeric(statistics.revenue ?? statistics.totalRevenue ?? record(sales.data).totalSales);
  const availableUnits = projects.reduce((sum, project) => sum + Math.max(0, project.unitsTotal - project.unitsSold), 0);
  const pendingFollowUps = followUps.filter(item => item.status !== 'completed');
  const firstName = (auth.user?.name || auth.user?.fullName || 'there').split(' ')[0];
  const today = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  const points = useMemo(() => {
    const values = record(sales.data).monthlySales;
    if (!Array.isArray(values)) return [];
    return values.map(value => { const row = record(value); return { month: String(row.label ?? row.monthName ?? row.month ?? ''), revenue: numeric(row.total ?? row.totalSales ?? row.revenue ?? row.amount) }; }).slice(-Number(months));
  }, [sales.data, months]);
  const pipeline = [
    { label: 'New enquiries', count: leads.filter(lead => lead.status === 'new').length, color: '#7b9aba' },
    { label: 'In conversation', count: leads.filter(lead => ['contacted', 'pending'].includes(lead.status)).length, color: '#c6ad79' },
    { label: 'Interested / site visits', count: leads.filter(lead => ['interested', 'site_visit', 'negotiation'].includes(lead.status)).length, color: '#91b6a2' },
    { label: 'Won opportunities', count: leads.filter(lead => lead.status === 'won').length, color: '#4d7796' },
  ];
  const refreshing = projectsFetching || leadsFetching || stats.isFetching || sales.isFetching;
  return <div className="dashboard-overview">
    <div className="dashboard-heading"><div><div className="dashboard-heading__eyebrow"><Building2 size={11} /> YOUR REAL ESTATE WORKSPACE</div><h1>Welcome back, <span>{firstName}.</span></h1><p>Here's a clear view of your portfolio, relationships, and next opportunities.</p></div><div className="dashboard-heading__actions"><span className="dashboard-date"><CalendarDays size={13} />{today}</span><Button asChild size="sm"><Link href={`/${role}/properties/new`}><Plus size={14} />Add property</Link></Button></div></div>
    <RevealSection><div className="dashboard-kpis">
      <StatCard label="Property portfolio" value={projects.length} icon={Building2} hint={`${availableUnits} units available`} tone="primary" />
      <StatCard label="Client relationships" value={leads.length} icon={Users} hint={`${leads.filter(lead => lead.status === 'new').length} new enquiries`} tone="info" />
      <StatCard label="Sales revenue" value={money(revenue)} icon={CircleDollarSign} hint="Recorded sales value" tone="success" />
      <StatCard label="Upcoming follow-ups" value={pendingFollowUps.length} icon={CalendarClock} hint={`${pendingFollowUps.filter(item => item.status === 'overdue').length} need your attention`} tone="warning" />
    </div></RevealSection>
    <div className="dashboard-grid">
      <DashboardPanel title="Portfolio performance" description="A view of your recorded sales revenue" action={<Select value={months} onValueChange={setMonths}><SelectTrigger className="w-32 h-7 text-[10px]" aria-label="Revenue chart period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">Last 6 months</SelectItem><SelectItem value="12">Last 12 months</SelectItem></SelectContent></Select>}>
        <div className="dashboard-performance"><strong>{money(revenue)}</strong><span>Total recorded revenue</span></div>
        {points.some(point => point.revenue > 0) ? <ChartContainer className="dashboard-chart aspect-auto w-full" config={{ revenue: { label: 'Revenue', color: '#6e8ead' } }}><AreaChart accessibilityLayer data={points} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}><defs><linearGradient id="overview-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#91acc5" stopOpacity={.24} /><stop offset="100%" stopColor="#91acc5" stopOpacity={.01} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} fontSize={9} /><YAxis tickFormatter={value => money(Number(value))} tickLine={false} axisLine={false} fontSize={8} width={65} /><ChartTooltip content={<ChartTooltipContent formatter={value => money(Number(value))} />} /><Area dataKey="revenue" type="monotone" fill="url(#overview-revenue-fill)" stroke="#7392af" strokeWidth={2} /></AreaChart></ChartContainer> : <div className="dashboard-chart-empty"><BarChart3 size={25} strokeWidth={1.2} /><strong>{sales.isError ? 'Revenue is temporarily unavailable' : 'Your next milestone starts here'}</strong><span>{sales.isError ? 'Use refresh to try again.' : 'Recorded sales will appear in this chart.'}</span></div>}
        <div className="dashboard-chart-legend"><span><i />Recorded revenue</span><span>Based on your workspace data</span></div>
      </DashboardPanel>
      <DashboardPanel title="Opportunity pipeline" description="Your client relationships by stage" action={<Link href={`/${role}/crm`}>View CRM <ArrowUpRight size={12} /></Link>}>
        <div className="dashboard-pipeline">{pipeline.map(stage => <div className="dashboard-pipeline__row" key={stage.label}><div className="dashboard-pipeline__label"><span><i style={{ background: stage.color }} />{stage.label}</span><strong>{stage.count}</strong></div><div className="dashboard-pipeline__track"><span style={{ width: `${leads.length ? stage.count / leads.length * 100 : 0}%`, background: stage.color }} /></div></div>)}</div>
        <div className="dashboard-pipeline__summary"><span><Target size={16} /></span><div><strong>{leads.length ? `${Math.round(pipeline[3].count / leads.length * 100)}% of enquiries won` : 'Make room for your next opportunity'}</strong><p>Keep every conversation connected to its next step.</p></div></div>
      </DashboardPanel>
    </div>
    <div className="dashboard-grid">
      <DashboardPanel title="Property collection" description="Explore the projects in your workspace" action={<Link href={`/${role}/properties`}>View portfolio <ArrowUpRight size={12} /></Link>}>
        {projects.length ? projects.slice(0, 3).map(project => <div className="dashboard-property" key={project.id}><span className="dashboard-property__cover">{project.cover && !project.noImage ? <img src={project.cover} alt={project.name} /> : <Building2 size={21} strokeWidth={1.2} />}</span><div className="dashboard-property__info"><strong>{project.name}</strong><p><MapPin size={10} />{[project.area, project.city].filter(Boolean).join(', ') || 'Location not added'}</p></div><div className="dashboard-property__price">{project.price}<small>{Math.max(0, project.unitsTotal - project.unitsSold)} units available</small></div><Link href={`/${role}/search-property/${project.id}`} aria-label={`View ${project.name}`}><ArrowUpRight size={15} /></Link></div>) : <div className="px-5 pb-5"><EmptyState icon={Building2} title={projectsError ? 'Portfolio unavailable' : 'Build your property collection'} description={projectsError ? 'We could not load your portfolio. Please refresh to try again.' : 'Add your first project to bring pricing, availability, and documents into one place.'} action={<Button asChild variant="outline" size="sm"><Link href={`/${role}/properties/new`}><Plus size={13} />Add your first property</Link></Button>} /></div>}
      </DashboardPanel>
      <DashboardPanel title="Your next touchpoints" description="Stay close to the conversations that matter" action={<Link href={`/${role}/followup`}>View all <ArrowUpRight size={12} /></Link>}>
        {pendingFollowUps.length ? [...pendingFollowUps].sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).slice(0, 3).map(item => <div className="dashboard-task" key={item.id}><span className="dashboard-task__icon"><Clock3 size={13} /></span><div className="min-w-0 flex-1"><strong>{item.customer}</strong><p>{item.description || 'Client follow-up'}</p><time>{item.when || item.scheduledAt}</time></div><StatusPill tone={item.status === 'overdue' ? 'danger' : 'info'}>{item.status === 'overdue' ? 'Overdue' : 'Scheduled'}</StatusPill></div>) : <div className="px-5 pb-5"><EmptyState icon={CalendarClock} title="A little space to plan ahead" description="Your upcoming client follow-ups will appear here." action={<Button asChild variant="outline" size="sm"><Link href={`/${role}/followup`}>Plan a follow-up <ArrowRight size={12} /></Link></Button>} /></div>}
      </DashboardPanel>
    </div>
    <div className="dashboard-footer"><span>RealEstate Guide · Your business, thoughtfully connected.</span><span><i />{refreshing ? 'Refreshing workspace…' : 'Live workspace data'}<Button size="icon-xs" variant="ghost" aria-label="Refresh overview" onClick={() => { void queryClient.invalidateQueries({ queryKey: ['v0'] }); }}><RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} /></Button></span></div>
  </div>;
}

function DashboardPanel({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <Card className="dashboard-card gap-0 py-0 ring-0"><div className="dashboard-card__head"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>{children}</Card>;
}
