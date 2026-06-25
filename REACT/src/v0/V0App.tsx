import { Suspense, lazy, use, useMemo, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { AppShell } from '@/components/shell/app-shell';
import { AuthenticatedBackground } from '@/components/effects/AuthenticatedBackground';
import ClickSpark from '@/components/effects/ClickSpark';
import { RequireAuth } from '../layout/RequireAuth';
import { RouteTransition } from '../motion';
import { ROLE_ORDER, type RoleKey } from '@/lib/roles';

type Params = Record<string, string>;

const routeFallback = <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

const RolesPage = lazy(() => import('@/app/roles/page'));
const SubAdminSignupPage = lazy(() => import('@/app/signup/subadmin/page'));
const FollowupPage = lazy(() => import('@/app/[role]/followup/page'));
const SearchPropertyPage = lazy(() => import('@/app/[role]/search-property/page'));
const PropertyDetailPage = lazy(() => import('@/app/[role]/search-property/[id]/page'));
const PropertiesPage = lazy(() => import('@/app/[role]/properties/page'));
const NewPropertyPage = lazy(() => import('@/app/[role]/properties/new/page'));
const SalesPage = lazy(() => import('@/app/[role]/sales/page'));
const CrmPage = lazy(() => import('@/app/[role]/crm/page'));
const AdminsPage = lazy(() => import('@/app/[role]/admins/page'));
const LocationsPage = lazy(() => import('@/app/[role]/locations/page'));
const ChatPage = lazy(() => import('@/app/[role]/chat/page'));
const AnalyticsPage = lazy(() => import('@/app/[role]/analytics/page'));
const MapPage = lazy(() => import('@/app/[role]/map/page'));
const SubscriptionPage = lazy(() => import('@/app/[role]/subscription/page'));

const loadLoginPage = () => import('@/app/login/[role]/page');

function isRole(value: string | undefined): value is RoleKey {
  return ROLE_ORDER.includes(value as RoleKey);
}

function useRoleParam() {
  const { role } = useParams();
  return isRole(role) ? role : 'superadmin';
}

function AsyncNode({ promise }: { promise: Promise<ReactNode> }) {
  return <>{use(promise)}</>;
}

function AsyncPage({
  render,
}: {
  render: (params: Promise<any>) => Promise<ReactNode>;
}) {
  const routeParams = useParams();
  const promise = useMemo(() => render(Promise.resolve(routeParams as Params)), [render, routeParams]);

  return (
    <Suspense fallback={routeFallback}>
      <AsyncNode promise={promise} />
    </Suspense>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={routeFallback}>{children}</Suspense>;
}

function SearchPageRoute() {
  const role = useRoleParam();
  return <SearchPropertyPage params={{ role }} />;
}

function PropertiesRoute() {
  const role = useRoleParam();
  return <PropertiesPage params={{ role }} />;
}

function NewPropertyRoute() {
  const role = useRoleParam();
  return <NewPropertyPage params={{ role }} />;
}

function EditPropertyRoute() {
  const role = useRoleParam();
  const { id = '' } = useParams();
  return <NewPropertyPage params={{ role, id }} />;
}

function MapRoute() {
  const role = useRoleParam();
  return <MapPage params={{ role }} />;
}

function SubscriptionRoute() {
  const role = useRoleParam();
  return <SubscriptionPage params={{ role }} />;
}

function PropertyDetailRoute({ initialTab }: { initialTab?: 'details' | 'configs' | 'documents' | 'sell' }) {
  const role = useRoleParam();
  const { id = '' } = useParams();
  return <PropertyDetailPage params={{ role, id }} initialTab={initialTab} />;
}

function ProjectDocumentsRoute() {
  const role = useRoleParam();
  const { projectId = '' } = useParams();
  return <PropertyDetailPage params={{ role, id: projectId }} initialTab="documents" />;
}

function RoleShell({ children, hideTopbar = false }: { children: ReactNode; hideTopbar?: boolean }) {
  const role = useRoleParam();
  return (
    <AuthenticatedBackground>
      <AppShell role={role} hideTopbar={hideTopbar}>
        <RouteTransition>{children}</RouteTransition>
      </AppShell>
    </AuthenticatedBackground>
  );
}

function FullscreenRoleShell({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedBackground>
      <RouteTransition>{children}</RouteTransition>
    </AuthenticatedBackground>
  );
}

function RoleIndexRedirect() {
  const role = useRoleParam();
  return <Navigate to={`/${role}/followup`} replace />;
}

function LegacyAddPropertyRedirect() {
  const role = useRoleParam();
  return <Navigate to={`/${role}/properties/new`} replace />;
}

function LegacySearchRedirect() {
  const role = useRoleParam();
  return <Navigate to={`/${role}/search-property`} replace />;
}

export function V0App() {
  return (
    <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={18} sparkCount={8} duration={420}>
      <Routes>
        <Route path="/" element={<Navigate to="/roles" replace />} />
        <Route path="/roles" element={<LazyRoute><RolesPage /></LazyRoute>} />
        <Route path="/login" element={<Navigate to="/roles" replace />} />
        <Route path="/login/:role" element={<AsyncPage render={(params) => loadLoginPage().then(({ default: LoginPage }) => LoginPage({ params }))} />} />
        <Route path="/signup/subadmin" element={<LazyRoute><SubAdminSignupPage /></LazyRoute>} />
        <Route path="/signup/razorpay" element={<LazyRoute><SubAdminSignupPage /></LazyRoute>} />

        <Route element={<RequireAuth />}>
          <Route path="/:role" element={<RoleIndexRedirect />} />
          <Route path="/:role/followup" element={<RoleShell><LazyRoute><FollowupPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/search-property" element={<RoleShell><LazyRoute><SearchPageRoute /></LazyRoute></RoleShell>} />
          <Route path="/:role/search-property/:id" element={<RoleShell><PropertyDetailRoute /></RoleShell>} />
          <Route path="/:role/project-documents" element={<LegacySearchRedirect />} />
          <Route path="/:role/projects/:projectId/documents" element={<RoleShell><ProjectDocumentsRoute /></RoleShell>} />
          <Route path="/:role/properties" element={<RoleShell><LazyRoute><PropertiesRoute /></LazyRoute></RoleShell>} />
          <Route path="/:role/properties/new" element={<FullscreenRoleShell><LazyRoute><NewPropertyRoute /></LazyRoute></FullscreenRoleShell>} />
          <Route path="/:role/properties/:id/edit" element={<FullscreenRoleShell><LazyRoute><EditPropertyRoute /></LazyRoute></FullscreenRoleShell>} />
          <Route path="/:role/add-property" element={<LegacyAddPropertyRedirect />} />
          <Route path="/app/add-property" element={<Navigate to="/superadmin/properties/new" replace />} />
          <Route path="/:role/sales" element={<RoleShell><LazyRoute><SalesPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/crm" element={<RoleShell><LazyRoute><CrmPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/admins" element={<RoleShell><LazyRoute><AdminsPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/subadmins" element={<RoleShell><LazyRoute><AdminsPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/employees" element={<RoleShell><LazyRoute><AdminsPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/locations" element={<RoleShell><LazyRoute><LocationsPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/add-location" element={<RoleShell><LazyRoute><LocationsPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/analytics" element={<RoleShell><LazyRoute><AnalyticsPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/map" element={<RoleShell><LazyRoute><MapRoute /></LazyRoute></RoleShell>} />
          <Route path="/:role/chat" element={<RoleShell><LazyRoute><ChatPage /></LazyRoute></RoleShell>} />
          <Route path="/:role/subscription" element={<RoleShell><LazyRoute><SubscriptionRoute /></LazyRoute></RoleShell>} />
        </Route>

        <Route path="/forgot-password" element={<Navigate to="/roles" replace />} />
        <Route path="/privacy" element={<Navigate to="/roles" replace />} />
        <Route path="/refund" element={<Navigate to="/roles" replace />} />
        <Route path="/terms" element={<Navigate to="/roles" replace />} />
        <Route path="*" element={<Navigate to="/roles" replace />} />
      </Routes>
    </ClickSpark>
  );
}
