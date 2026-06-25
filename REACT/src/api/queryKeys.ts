import type { ApiFeatureKey } from './endpointCatalog';

const keyId = (id: string | number) => String(id);

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    activity: () => ['dashboard', 'activity'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const,
    roleMap: (role: string, userId?: string | number, city?: string, area?: string) =>
      ['projects', 'map', role, userId ?? 'all', city ?? 'all', area ?? 'all'] as const,
    search: (query: string) => ['projects', 'search', query] as const,
    detail: (id: string | number) => ['projects', 'detail', keyId(id)] as const,
    byCity: (city: string, area?: string) => ['projects', 'city', city, area ?? 'all'] as const,
    documents: (projectId: string | number) => ['projects', keyId(projectId), 'documents'] as const,
    projectDocuments: (projectId: string | number) => ['projects', keyId(projectId), 'projectDocuments'] as const,
  },
  leads: {
    all: ['leads'] as const,
    list: () => ['leads', 'list'] as const,
    stats: () => ['leads', 'stats'] as const,
  },
  followUps: {
    all: ['followUps'] as const,
    dashboard: (from?: string, to?: string) => ['followUps', 'dashboard', from ?? 'default', to ?? 'default'] as const,
    pendingCount: () => ['followUps', 'pendingCount'] as const,
    byLead: (leadId: string | number) => ['followUps', 'lead', keyId(leadId)] as const,
  },
  sales: {
    all: ['sales'] as const,
    list: (role?: string) => ['sales', 'list', role ?? 'default'] as const,
    analytics: () => ['sales', 'analytics'] as const,
    performance: (range?: string, groupBy?: string, userId?: string | number) =>
      ['sales', 'performance', range ?? '7d', groupBy ?? 'default', userId ? keyId(userId) : 'all'] as const,
  },
  locations: {
    all: ['locations'] as const,
    list: () => ['locations', 'list'] as const,
    detail: (id: string | number) => ['locations', 'detail', keyId(id)] as const,
    cities: (state?: string) => ['locations', 'cities', state ?? 'all'] as const,
    rate: (query: Record<string, string>) => ['locations', 'rate', query] as const,
    resolveMapUrl: (query: Record<string, string>) => ['locations', 'resolveMapUrl', query] as const,
    areas: (city?: string, state?: string) => ['locations', 'areas', city ?? 'all', state ?? 'all'] as const,
  },
  areas: {
    all: ['areas'] as const,
    list: (city?: string) => ['areas', 'list', city ?? 'all'] as const,
  },
  documents: {
    all: ['documents'] as const,
    byProject: (projectId: string | number) => ['documents', 'project', keyId(projectId)] as const,
    byUploader: (uploadedBy: string | number) => ['documents', 'uploader', keyId(uploadedBy)] as const,
    configDocs: (configId: string | number) => ['documents', 'config', keyId(configId)] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
    admins: () => ['users', 'superadmin', 'admins'] as const,
    subadmins: () => ['users', 'superadmin', 'subadmins'] as const,
    recentSubadmins: () => ['users', 'superadmin', 'subadmins', 'recent'] as const,
    addedByMeSubadmins: () => ['users', 'superadmin', 'subadmins', 'addedByMe'] as const,
    employees: () => ['users', 'superadmin', 'employees'] as const,
    adminSubadmins: () => ['users', 'admin', 'subadmins'] as const,
    adminAddedSubadmins: () => ['users', 'admin', 'subadmins', 'added'] as const,
    adminSelfSignedSubadmins: () => ['users', 'admin', 'subadmins', 'selfSigned'] as const,
    adminEmployees: () => ['users', 'admin', 'employees'] as const,
    selfSignedSubadmins: () => ['users', 'superadmin', 'subadmins', 'selfSigned'] as const,
    subadminDetail: (id: string | number) => ['users', 'superadmin', 'subadmin', keyId(id)] as const,
    detail: (role: string, kind: string, id: string | number) => ['users', role, kind, keyId(id), 'detail'] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: () => ['employees', 'list'] as const,
    detail: (id: string | number) => ['employees', keyId(id)] as const,
  },
  kyc: {
    all: ['kyc'] as const,
    document: (id: string | number) => ['kyc', 'document', keyId(id)] as const,
    userDocuments: (userId: string | number) => ['kyc', 'user', keyId(userId)] as const,
  },
  chat: {
    all: ['chat'] as const,
    conversations: () => ['chat', 'conversations'] as const,
    messages: (conversationId: string) => ['chat', 'conversations', conversationId, 'messages'] as const,
    messageSearch: (q: string, conversationId?: string) => ['chat', 'messages', 'search', q, conversationId ?? 'all'] as const,
    globalSearch: (q: string) => ['chat', 'globalSearch', q] as const,
    userSearch: (q: string) => ['chat', 'users', q] as const,
    reactions: (messageId: string) => ['chat', 'messages', messageId, 'reactions'] as const,
  },
  subadminRegistration: {
    all: ['subadminRegistration'] as const,
    checkEmail: (email: string) => ['subadminRegistration', 'email', email] as const,
    status: (token: string) => ['subadminRegistration', 'status', token] as const,
  },
  subadmin: {
    all: ['subadmin'] as const,
    checkEmail: (email: string) => ['subadmin', 'email', email] as const,
    registrationStatus: (token: string) => ['subadmin', 'registrationStatus', token] as const,
  },
  payments: {
    all: ['payments'] as const,
    createOrder: () => ['payments', 'createOrder'] as const,
    bySubadmin: (id: string | number) => ['payments', 'subadmin', keyId(id)] as const,
    renew: () => ['payments', 'renew'] as const,
    verifyRenewal: () => ['payments', 'renew', 'verify'] as const,
  },
  subscription: {
    all: ['subscription'] as const,
    status: (userId: string | number) => ['subscription', 'status', keyId(userId)] as const,
    detail: (userId: string | number) => ['subscription', 'detail', keyId(userId)] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    details: (userId: string | number) => ['subscriptions', 'details', keyId(userId)] as const,
  },
  search: {
    all: ['search'] as const,
    global: (q: string) => ['search', 'global', q] as const,
    root: (q: string) => ['search', 'root', q] as const,
  },
} as const;

export const featureQueryRoots: Record<ApiFeatureKey, readonly string[]> = {
  auth: queryKeys.auth.all,
  dashboard: queryKeys.dashboard.all,
  projects: queryKeys.projects.all,
  leads: queryKeys.leads.all,
  followUps: queryKeys.followUps.all,
  sales: queryKeys.sales.all,
  locations: queryKeys.locations.all,
  documents: queryKeys.documents.all,
  users: queryKeys.users.all,
  employees: queryKeys.employees.all,
  kyc: queryKeys.kyc.all,
  chat: queryKeys.chat.all,
  subadminRegistration: queryKeys.subadminRegistration.all,
  payments: queryKeys.payments.all,
  subscription: queryKeys.subscription.all,
  search: queryKeys.search.all,
};
