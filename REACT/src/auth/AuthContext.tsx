import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { estateApi } from '../api/estateApi';
import { defaultRouteForRole, roleFromUser } from '../coverage/features';
import { queryClient } from '../queryClient';
import { disconnectChatSockets } from '../services/chatSocket';
import { readStorage, removeStorage, writeStorage } from '../services/storage';
import { tokenStore } from '../services/tokenStore';
import type { ApiUser, Role } from '../types/domain';

interface AuthContextValue {
  ready: boolean;
  token: string;
  user: ApiUser | null;
  role: Role;
  homeRoute: string;
  login: (email: string, password: string, role?: Role) => Promise<Role>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  selectRole: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractToken(response: { token?: string; jwt?: string }) {
  return response.token ?? response.jwt ?? '';
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  if (!token) return {};
  const [, payload] = token.split('.');
  if (!payload) return {};
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function roleFromJwt(token: string, fallback: Role) {
  const payload = decodeJwtPayload(token);
  return roleFromUser(stringValue(payload.role) ?? stringValue(payload.authority), fallback);
}

function userFromLoginResponse(response: { userId?: string | number; name?: string; email?: string; role?: string }): ApiUser | null {
  if (!response.userId && !response.email && !response.name && !response.role) return null;
  return {
    id: response.userId,
    name: response.name,
    email: response.email,
    role: response.role,
  };
}

function resolveSessionRole(options: {
  responseRole?: string;
  user?: ApiUser | null;
  token?: string;
  fallback: Role;
}) {
  const responseRole = stringValue(options.responseRole);
  if (responseRole) return roleFromUser(responseRole, options.fallback);
  const userRole = stringValue(options.user?.role) ?? stringValue(options.user?.userRole);
  if (userRole) return roleFromUser(userRole, options.fallback);
  if (options.token) return roleFromJwt(options.token, options.fallback);
  return options.fallback;
}

function roleToBackend(role: Role) {
  if (role === 'superadmin') return 'SUPER_ADMIN';
  if (role === 'subadmin') return 'SUB_ADMIN';
  return role.toUpperCase();
}

function loginEmailForRole(email: string, password: string, role: Role) {
  if (email.trim().toLowerCase() !== 'sherry' || password !== 'sherry') return email;
  const seededEmails: Record<Role, string> = {
    superadmin: 'super@sherry.com',
    admin: 'admin@sherry.com',
    subadmin: 'sub@sherry.com',
    employee: 'employee@sherry.com',
  };
  return seededEmails[role];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState('');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [activeRole, setActiveRole] = useState<Role | ''>('');

  const setToken = useCallback(async (nextToken: string) => {
    tokenStore.set(nextToken);
    setTokenState(nextToken);
    if (nextToken) {
      await writeStorage('authToken', nextToken);
    } else {
      await removeStorage('authToken');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const current = await estateApi.auth.me();
    setUser(current);
    const nextRole = resolveSessionRole({
      user: current,
      token: tokenStore.get(),
      fallback: activeRole || 'employee',
    });
    setActiveRole(nextRole);
    await writeStorage('activeRole', nextRole);
  }, [activeRole]);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      const storedToken = await readStorage('authToken');
      if (cancelled) return;
      if (storedToken) {
        tokenStore.set(storedToken);
        setTokenState(storedToken);
        try {
          const current = await estateApi.auth.me();
          const storedRole = roleFromUser(await readStorage('activeRole') ?? undefined, 'employee');
          const nextRole = resolveSessionRole({
            user: current,
            token: storedToken,
            fallback: storedRole,
          });
          if (!cancelled) {
            setUser(current);
            setActiveRole(nextRole);
            await writeStorage('activeRole', nextRole);
          }
        } catch {
          tokenStore.clear();
          await removeStorage('authToken');
          await removeStorage('activeRole');
          if (!cancelled) {
            setTokenState('');
            setUser(null);
            setActiveRole('');
          }
        }
      }
      if (!cancelled) setReady(true);
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, selectedRole?: Role) => {
      let response: any = null;
      let finalRole: Role = 'subadmin';

      if (selectedRole) {
        finalRole = selectedRole;
        response = await estateApi.auth.login({
          email: loginEmailForRole(email, password, selectedRole),
          password,
          role: roleToBackend(selectedRole),
        });
      } else {
        const emailLower = email.trim().toLowerCase();
        let rolesToTry: Role[] = ['subadmin', 'employee', 'admin', 'superadmin'];
        if (emailLower.includes('super')) {
          rolesToTry = ['superadmin', 'admin', 'subadmin', 'employee'];
        } else if (emailLower.includes('sub')) {
          rolesToTry = ['subadmin', 'employee', 'admin', 'superadmin'];
        } else if (emailLower.includes('admin')) {
          rolesToTry = ['admin', 'subadmin', 'superadmin', 'employee'];
        } else if (emailLower.includes('employee') || emailLower.includes('emp')) {
          rolesToTry = ['employee', 'subadmin', 'admin', 'superadmin'];
        }

        let lastError: any = null;
        for (const role of rolesToTry) {
          try {
            response = await estateApi.auth.login({
              email: loginEmailForRole(email, password, role),
              password,
              role: roleToBackend(role),
            });
            finalRole = role;
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (!response) {
          throw lastError ?? new Error('Login failed');
        }
      }

      const nextToken = extractToken(response);
      if (!nextToken) throw new Error('Login response did not include a token');
      tokenStore.set(nextToken);
      await writeStorage('authToken', nextToken);
      try {
        const responseUser = response.user ?? userFromLoginResponse(response);
        let current = responseUser;
        try {
          current = await estateApi.auth.me();
        } catch {
          if (!current) throw new Error('Unable to load signed-in user profile');
        }
        const nextRole = resolveSessionRole({
          responseRole: response.role,
          user: current,
          token: nextToken,
          fallback: finalRole,
        });
        setUser(current ? { ...current, role: current.role ?? response.role ?? roleToBackend(nextRole) } : null);
        setActiveRole(nextRole);
        await writeStorage('activeRole', nextRole);
        setTokenState(nextToken);
        return nextRole;
      } catch (error) {
        tokenStore.clear();
        await removeStorage('authToken');
        await removeStorage('activeRole');
        setTokenState('');
        setUser(null);
        setActiveRole('');
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await disconnectChatSockets();
    await queryClient.cancelQueries();
    queryClient.clear();
    await setToken('');
    await removeStorage('activeRole');
    tokenStore.clear();
    setUser(null);
    setActiveRole('');
  }, [setToken]);

  const baseRole = resolveSessionRole({
    user,
    token,
    fallback: activeRole || 'employee',
  });
  const role = user || token ? baseRole : activeRole || baseRole;

  const selectRole = useCallback(async (nextRole: Role) => {
    setActiveRole(nextRole);
    await writeStorage('activeRole', nextRole);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      role,
      homeRoute: defaultRouteForRole(role),
      login,
      logout,
      refreshUser,
      selectRole,
    }),
    [ready, token, user, role, activeRole, login, logout, refreshUser, selectRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
