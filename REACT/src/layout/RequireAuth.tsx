import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { estateApi } from '../api/estateApi';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ForbiddenState } from '../components/AsyncState';
import { canAccessRolePath, normalizeRole } from '../coverage/features';
import type { ApiUser, Role } from '../types/domain';

const knownRoles = new Set<Role>(['superadmin', 'admin', 'subadmin', 'employee']);

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  const params = useParams();
  const validRouteRole = params.role ? normalizeRouteRole(params.role) : null;
  const pathParts = location.pathname.split('/').filter(Boolean);
  const routeSlug = validRouteRole && pathParts[1] === 'projects' && pathParts[3] === 'documents'
    ? 'project-documents'
    : validRouteRole ? pathParts[1] : undefined;
  const userId = auth.user?.id;
  const authenticatedRole = normalizeRole('employee', auth.role);
  const checkingSubadminSubscription = auth.ready && !!auth.token && authenticatedRole === 'subadmin' && validRouteRole === 'subadmin' && routeSlug !== 'subscription';
  const subscriptionStatus = useQuery({
    queryKey: userId ? queryKeys.subscription.status(userId) : queryKeys.subscription.all,
    queryFn: () => userId ? estateApi.subscription.status(userId) : Promise.resolve(false),
    enabled: checkingSubadminSubscription && !!userId,
  });

  if (!auth.ready) return <main className="workspace loading-state">Loading session...</main>;

  // After auth session is ready, only redirect if we definitively have no token.
  // This prevents transient token-clearing during fast client-side route transitions.
  if (!auth.token && !auth.user) {
    return <Navigate to="/roles" replace state={{ from: location.pathname }} />;
  }

  if (params.role && !validRouteRole) return <Navigate to={auth.homeRoute} replace />;
  if (validRouteRole && validRouteRole !== authenticatedRole) {
    return (
      <main className="workspace">
        <ForbiddenState title="Wrong role" subtitle={`Sign in as ${validRouteRole} to open this workspace.`} />
      </main>
    );
  }
  if (validRouteRole && !canAccessRolePath(authenticatedRole, routeSlug)) {
    return (
      <main className="workspace">
        <ForbiddenState title="Access restricted" subtitle="This role does not include that Flutter workspace action." />
      </main>
    );
  }
  if (checkingSubadminSubscription) {
    const expiredFromUser = isExpiredSubadmin(auth.user);
    const expiredFromStatus = subscriptionStatus.isSuccess && subscriptionStatus.data === false;
    if (!expiredFromUser && subscriptionStatus.isPending && userId) {
      return <main className="workspace loading-state">Checking subscription...</main>;
    }
    if (!expiredFromUser && subscriptionStatus.isError && !hasActiveSubadmin(auth.user)) {
      return (
        <main className="workspace">
          <ForbiddenState
            title="Subscription check unavailable"
            subtitle="We could not verify your subscription. Try again before opening this workspace."
            action={<button className="primary-button" type="button" onClick={() => subscriptionStatus.refetch()}>Retry</button>}
          />
        </main>
      );
    }
    if (expiredFromUser || expiredFromStatus) {
      return <Navigate to="/subadmin/subscription" replace state={{ from: location.pathname }} />;
    }
  }
  return <Outlet />;
}

function isExpiredSubadmin(user: ApiUser | null) {
  if (!user) return false;
  const status = String(user.subscriptionStatus ?? user.status ?? '').toLowerCase();
  if (status.includes('expired')) return true;
  const active = user.subscriptionActive ?? user.activeSubscription;
  if (active === false) return true;
  const rawDate = user.subscriptionExpiresAt ?? user.planExpiry ?? user.expiryDate;
  if (!rawDate) return false;
  const expiry = new Date(String(rawDate));
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now();
}

function hasActiveSubadmin(user: ApiUser | null) {
  if (!user) return false;
  const active = user.subscriptionActive ?? user.activeSubscription;
  if (active === true) return true;
  const rawDate = user.subscriptionExpiresAt ?? user.planExpiry ?? user.expiryDate;
  if (!rawDate) return false;
  const expiry = new Date(String(rawDate));
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() >= Date.now();
}

function normalizeRouteRole(rawRole: string): Role | null {
  const normalized = rawRole.toLowerCase().replace(/[_\s-]/g, '');
  if (['superadmin', 'rolesuperadmin', 'superadministrator'].includes(normalized)) return 'superadmin';
  if (['admin', 'roleadmin', 'administrator'].includes(normalized)) return 'admin';
  if (['subadmin', 'rolesubadmin', 'subadministrator'].includes(normalized)) return 'subadmin';
  if (['employee', 'roleemployee'].includes(normalized)) return 'employee';
  return null;
}
