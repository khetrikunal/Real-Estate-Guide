import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, ChevronRight, Menu, Plus, Search, UserRound } from 'lucide-react';
import { useAuth } from '@app/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { RoleKey } from '@/lib/roles';

const labels: Record<string, string> = { overview: 'Overview', followup: 'Follow-ups', properties: 'Property portfolio', 'search-property': 'Property discovery', crm: 'Client relationships', sales: 'Sales & transactions', admins: 'User management', subadmins: 'Sub Admins', employees: 'Employees', analytics: 'Analytics & insights', locations: 'Location management', chat: 'Team conversations', map: 'Location explorer', subscription: 'Subscription' };

export function WorkspaceTopbar({ role, onOpenCommand, onOpenProfile, onOpenMobile, subscriptionWarning }: {
  role: RoleKey; onOpenCommand: () => void; onOpenProfile: () => void; onOpenMobile?: () => void; subscriptionWarning?: string;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const section = pathname.split('/')[2] || 'overview';
  const label = labels[section] || 'Workspace';
  return <header className="workspace-topbar">
    <div className="workspace-breadcrumb"><Button size="icon" variant="ghost" className="workspace-mobile-menu" onClick={onOpenMobile} aria-label="Open navigation"><Menu size={19} /></Button><span className="workspace-breadcrumb__root">Workspace</span><ChevronRight size={13} /><strong>{label}</strong>{pathname.includes('/new') && <><ChevronRight size={13} /><span>{section === 'properties' ? 'New project' : 'New account'}</span></>}</div>
    <div className="workspace-topbar__actions">
      {subscriptionWarning && <Button variant="outline" size="sm" className="text-destructive border-destructive/20" onClick={() => navigate('/subadmin/subscription')} title={subscriptionWarning}><AlertTriangle size={14} /><span className="workspace-subscription-copy">Review subscription</span></Button>}
      <Button variant="ghost" className="workspace-command" onClick={onOpenCommand} aria-label="Search workspace"><Search size={16} /><span>Search anything</span><kbd>⌘ K</kbd></Button>
      <Badge variant="outline" className="workspace-environment"><span />Live workspace</Badge>
      <Separator orientation="vertical" className="h-5" />
      <Button size="sm" variant="outline" className="workspace-quick-add" onClick={() => navigate(`/${role}/properties/new`)}><Plus size={15} /><span>Add property</span></Button>
      <button className="workspace-topbar__profile" type="button" onClick={onOpenProfile} aria-label="Open profile drawer"><Avatar className="size-8"><AvatarImage src={typeof user?.profilePhotoUrl === 'string' ? user.profilePhotoUrl : undefined} alt="" /><AvatarFallback className="bg-primary/8 text-primary text-xs">{user?.name?.[0]?.toUpperCase() || <UserRound size={14} />}</AvatarFallback></Avatar></button>
    </div>
  </header>;
}
