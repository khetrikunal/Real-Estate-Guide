import Link from 'next/link';
import { useLocation } from 'react-router-dom';
import { Building2, ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen, Search, Settings2 } from 'lucide-react';
import { useAuth } from '@app/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { navSectionsForRole } from '@/lib/nav';
import { ROLES, type RoleKey } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface Props {
  role: RoleKey; collapsed: boolean; onToggleCollapsed: () => void; onOpenProfile: () => void; onOpenCommand: () => void;
  mobile?: boolean; onNavigate?: () => void;
}

export function AppSidebar({ role, collapsed, onToggleCollapsed, onOpenProfile, onOpenCommand, mobile, onNavigate }: Props) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const name = user?.name || user?.fullName || 'Your account';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(value => value[0]).join('').toUpperCase();
  const sections = navSectionsForRole(role);
  return <aside className={cn('workspace-sidebar', collapsed && 'is-collapsed', mobile && 'workspace-sidebar--mobile')} aria-label="Main navigation">
    <Link href={`/${role}/overview`} className="workspace-brand" onClick={onNavigate}><span className="workspace-brand__mark"><Building2 size={21} strokeWidth={1.7} /></span>{!collapsed && <span><strong>RealEstate<span>Guide</span><i>.</i></strong><small>BUSINESS WORKSPACE</small></span>}</Link>
    {!collapsed && <div className="workspace-identity"><span className="workspace-identity__icon"><Building2 size={16} /></span><div><strong>{ROLES[role].label}</strong><span>Real estate operations</span></div><span className="workspace-identity__dot" /></div>}
    <Button variant="outline" className="workspace-nav-search" onClick={onOpenCommand} aria-label="Search workspace"><Search size={15} />{!collapsed && <><span>Search workspace</span><kbd>⌘ K</kbd></>}</Button>
    <nav className="workspace-nav">
      {sections.map(section => <div className="workspace-nav-group" key={section.label}>
        {!collapsed && <h2>{section.label}</h2>}
        {section.items.map(item => {
          const href = item.href(role);
          const active = pathname === href || (item.key !== 'overview' && pathname.startsWith(`${href}/`))
            || (item.key === 'admins' && ['subadmins', 'employees'].includes(pathname.split('/')[2]));
          const Icon = item.icon;
          const link = <Link href={href} onClick={onNavigate} className={cn('workspace-nav-link', active && 'is-active')} aria-label={item.label} aria-current={active ? 'page' : undefined}><Icon size={17} strokeWidth={1.65} />{!collapsed && <span>{item.label}</span>}{active && !collapsed && <span className="workspace-nav-link__dot" />}</Link>;
          return collapsed ? <Tooltip key={item.key}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip> : <div key={item.key}>{link}</div>;
        })}
      </div>)}
    </nav>
    <div className="workspace-sidebar__bottom">
      {!collapsed && <div className="workspace-sidebar__edition"><span className="workspace-edition-dot" /> Connected workspace <span>LIVE</span></div>}
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="workspace-account" aria-label="Account menu">
        <Avatar className="size-9 rounded-xl"><AvatarImage src={typeof user?.profilePhotoUrl === 'string' ? user.profilePhotoUrl : undefined} alt="" /><AvatarFallback className="rounded-xl bg-primary/8 text-primary text-xs font-semibold">{initials}</AvatarFallback></Avatar>
        {!collapsed && <><span><strong>{name}</strong><small>{ROLES[role].label}</small></span><ChevronsUpDown size={14} /></>}
      </button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-56"><DropdownMenuLabel>{user?.email || name}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={onOpenProfile}><Settings2 size={15} />Profile & preferences</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={async () => { await logout(); window.location.assign('/roles'); }}><LogOut size={15} />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      {!mobile && <Button variant="ghost" className="workspace-collapse" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span>Collapse sidebar</span></>}</Button>}
    </div>
  </aside>;
}
