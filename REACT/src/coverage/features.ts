import type { FeatureDefinition, FeatureEndpoint, Role } from '../types/domain';

const roleLabels: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  subadmin: 'Sub Admin',
  employee: 'Employee',
};

const endpoints: Record<string, FeatureEndpoint[]> = {
  followup: [{ method: 'GET', path: '/crm/follow-ups/dashboard', label: 'Dashboard follow-ups' }],
  propertyCreate: [
    { method: 'POST', path: '/projects/create', label: 'Create property' },
    { method: 'POST', path: '/documents/upload/{projectId}', label: 'Upload documents' },
    { method: 'POST', path: '/projects/{id}/cover-photo', label: 'Upload cover photo' },
    { method: 'GET', path: '/locations/resolve-map-url', label: 'Resolve map URL' },
  ],
  propertySearch: [
    { method: 'GET', path: '/projects', label: 'List properties' },
    { method: 'GET', path: '/projects/search', label: 'Search properties' },
    { method: 'GET', path: '/projects/{id}/documents', label: 'Property documents' },
  ],
  documents: [
    { method: 'GET', path: '/documents/{projectId}', label: 'Project documents' },
    { method: 'POST', path: '/documents/upload/{projectId}', label: 'Upload project documents' },
    { method: 'GET', path: '/documents/download/{documentId}', label: 'Signed document download' },
    { method: 'DELETE', path: '/documents/{documentId}', label: 'Delete document' },
    { method: 'POST', path: '/documents/upload/config/{configId}', label: 'Upload config documents' },
    { method: 'GET', path: '/documents/config/{configId}', label: 'Config documents' },
  ],
  sales: [
    { method: 'GET', path: '/sales', label: 'Sales list' },
    { method: 'POST', path: '/sales/record', label: 'Record sale' },
    { method: 'GET', path: '/sales/analytics', label: 'Sales analytics' },
    { method: 'GET', path: '/sales/performance', label: 'Sales performance' },
  ],
  analytics: [
    { method: 'GET', path: '/dashboard/stats', label: 'Dashboard stats' },
    { method: 'GET', path: '/dashboard/activity', label: 'Activity feed' },
    { method: 'GET', path: '/sales/analytics', label: 'Sales analytics' },
    { method: 'GET', path: '/sales/performance', label: 'Sales performance' },
  ],
  locations: [
    { method: 'GET', path: '/locations', label: 'Locations' },
    { method: 'GET', path: '/locations/{id}', label: 'Location detail' },
    { method: 'GET', path: '/locations/cities', label: 'Cities' },
    { method: 'POST', path: '/locations/cities', label: 'Create city' },
    { method: 'GET', path: '/locations/rate', label: 'Location rate' },
    { method: 'POST', path: '/locations', label: 'Create location' },
    { method: 'PUT', path: '/locations/{id}', label: 'Update location' },
    { method: 'DELETE', path: '/locations/{id}', label: 'Delete location' },
    { method: 'GET', path: '/areas', label: 'Areas' },
    { method: 'POST', path: '/areas', label: 'Create area' },
    { method: 'DELETE', path: '/areas/{id}', label: 'Delete area' },
  ],
  crm: [
    { method: 'GET', path: '/leads/all', label: 'Lead list' },
    { method: 'GET', path: '/leads/stats', label: 'Lead stats' },
    { method: 'POST', path: '/leads/create', label: 'Create lead' },
    { method: 'POST', path: '/leads/assign', label: 'Assign lead' },
    { method: 'POST', path: '/leads/update-status', label: 'Update lead status' },
  ],
  chat: [
    { method: 'GET', path: '/chat/conversations', label: 'Conversations' },
    { method: 'GET', path: '/chat/conversations/{conversationId}/messages', label: 'Conversation messages' },
    { method: 'GET', path: '/chat/search/messages', label: 'Message search' },
    { method: 'GET', path: '/chat/users/search', label: 'User search' },
    { method: 'POST', path: '/chat/conversations', label: 'Create conversation' },
    { method: 'DELETE', path: '/chat/conversations/{conversationId}', label: 'Delete conversation' },
    { method: 'POST', path: '/chat/conversations/{conversationId}/read', label: 'Mark read' },
    { method: 'POST', path: '/chat/upload', label: 'Upload attachment' },
    { method: 'GET', path: '/chat/files/{filename}', label: 'Signed media preview' },
    { method: 'POST', path: '/chat/messages/{messageId}/react', label: 'Add reaction' },
    { method: 'DELETE', path: '/chat/messages/{messageId}/react', label: 'Remove reaction' },
    { method: 'PATCH', path: '/chat/messages/{messageId}', label: 'Edit message' },
    { method: 'DELETE', path: '/chat/messages/{messageId}', label: 'Delete message' },
    { method: 'POST', path: '/chat/presence', label: 'Presence' },
    { method: 'POST', path: '/chat/fcm-token', label: 'FCM token' },
    { method: 'GET', path: '/search/global', label: 'Global search' },
    { method: 'WS', path: '/ws', label: 'STOMP chat events' },
  ],
  map: [
    { method: 'GET', path: '/locations/resolve-map-url', label: 'Map resolver' },
    { method: 'GET', path: '/projects', label: 'Role project map' },
    { method: 'GET', path: '/projects/employee/{employeeId}', label: 'Employee project map' },
    { method: 'GET', path: '/projects/broker/{brokerId}', label: 'Broker project map' },
    { method: 'PATCH', path: '/projects/{id}', label: 'Persist resolved coordinates' },
    { method: 'GET', path: '/projects/search', label: 'Mapped property search' },
  ],
  subadminSignup: [
    { method: 'GET', path: '/subadmin/check-email', label: 'Check email' },
    { method: 'POST', path: '/subadmin/initiate-registration', label: 'Initiate registration' },
    { method: 'GET', path: '/subadmin/registration-status', label: 'Registration status' },
    { method: 'POST', path: '/kyc/uploads/temp/{token}', label: 'Temporary KYC upload' },
    { method: 'POST', path: '/payments/verify-and-complete', label: 'Verify and complete' },
    { method: 'POST', path: '/payments/mark-failed', label: 'Mark failed payment' },
  ],
  razorpay: [
    { method: 'POST', path: '/payment/create-order', label: 'Create payment order' },
    { method: 'POST', path: '/payment/verify', label: 'Verify payment' },
    { method: 'POST', path: '/payment/renew', label: 'Renew subscription' },
    { method: 'POST', path: '/payment/renew/verify', label: 'Verify renewal' },
    { method: 'POST', path: '/subscription/subscribe', label: 'Subscribe' },
    { method: 'GET', path: '/subscription/{userId}', label: 'Subscription detail' },
  ],
};

const roleEndpoints: Record<Role, Record<string, FeatureEndpoint[]>> = {
  superadmin: {
    admin: [
      { method: 'GET', path: '/superadmin/admins', label: 'Admins' },
      { method: 'GET', path: '/superadmin/admins/{id}/detail', label: 'Admin detail' },
      { method: 'POST', path: '/superadmin/create-admin', label: 'Create admin' },
      { method: 'PATCH', path: '/superadmin/users/{id}/kyc', label: 'Update KYC' },
      { method: 'POST', path: '/kyc/uploads/users/{userId}', label: 'Upload user KYC' },
      { method: 'GET', path: '/kyc/documents/{documentId}', label: 'Preview KYC document' },
      { method: 'DELETE', path: '/superadmin/admins/{id}', label: 'Delete admin' },
    ],
    subadmin: [
      { method: 'GET', path: '/superadmin/subadmins', label: 'Subadmins' },
      { method: 'GET', path: '/superadmin/subadmins/{id}', label: 'Subadmin detail' },
      { method: 'POST', path: '/superadmin/create-subadmin', label: 'Create subadmin' },
      { method: 'GET', path: '/superadmin/subadmins/self-signed-up', label: 'Self signups' },
      { method: 'PATCH', path: '/superadmin/users/{id}/kyc', label: 'Update KYC' },
      { method: 'POST', path: '/kyc/uploads/users/{userId}', label: 'Upload user KYC' },
      { method: 'GET', path: '/kyc/documents/{documentId}', label: 'Preview KYC document' },
      { method: 'DELETE', path: '/superadmin/subadmins/{id}', label: 'Delete subadmin' },
    ],
    employees: [
      { method: 'GET', path: '/superadmin/employees', label: 'Employees' },
      { method: 'GET', path: '/superadmin/employees/{id}/detail', label: 'Employee detail' },
      { method: 'POST', path: '/superadmin/create-employee', label: 'Create employee' },
      { method: 'PATCH', path: '/superadmin/users/{id}/kyc', label: 'Update KYC' },
      { method: 'POST', path: '/kyc/uploads/users/{userId}', label: 'Upload user KYC' },
      { method: 'GET', path: '/kyc/documents/{documentId}', label: 'Preview KYC document' },
      { method: 'DELETE', path: '/superadmin/employees/{id}', label: 'Delete employee' },
    ],
  },
  admin: {
    admin: [{ method: 'GET', path: '/auth/me', label: 'Current admin account' }],
    subadmin: [
      { method: 'GET', path: '/admin/subadmins', label: 'Subadmins' },
      { method: 'GET', path: '/admin/subadmins/added', label: 'Added subadmins' },
      { method: 'GET', path: '/admin/subadmins/self-signed-up', label: 'Self signups' },
      { method: 'GET', path: '/admin/subadmins/{id}', label: 'Subadmin detail' },
      { method: 'GET', path: '/kyc/documents/{documentId}', label: 'Preview KYC document' },
    ],
    employees: [
      { method: 'GET', path: '/admin/employees', label: 'Employees' },
      { method: 'GET', path: '/admin/employees/{id}/detail', label: 'Employee detail' },
      { method: 'POST', path: '/admin/employees', label: 'Create employee' },
      { method: 'PATCH', path: '/admin/employees/{id}', label: 'Update employee' },
      { method: 'POST', path: '/kyc/uploads/users/{userId}', label: 'Upload user KYC' },
      { method: 'GET', path: '/kyc/documents/{documentId}', label: 'Preview KYC document' },
      { method: 'DELETE', path: '/admin/employees/{id}', label: 'Delete employee' },
    ],
  },
  subadmin: {
    admin: [{ method: 'GET', path: '/auth/me', label: 'Current account' }],
    subadmin: [
      { method: 'GET', path: '/subscription/status/{userId}', label: 'Subscription status' },
      { method: 'GET', path: '/subscription/{userId}', label: 'Broker subscription detail' },
      { method: 'GET', path: '/payment/by-subadmin/{id}', label: 'Payment status' },
    ],
    employees: [{ method: 'GET', path: '/auth/me', label: 'Profile only' }],
  },
  employee: {
    admin: [{ method: 'GET', path: '/auth/me', label: 'Assigned admin profile' }],
    subadmin: [{ method: 'GET', path: '/auth/me', label: 'Assigned subadmin profile' }],
    employees: [{ method: 'GET', path: '/auth/me', label: 'Employee profile' }],
  },
};

const featureMap = [
  ['followup', 'Follow-up', 'followup.md', endpoints.followup, 'feature'],
  ['add-property', 'Add Property', 'add property.md', endpoints.propertyCreate, 'feature'],
  ['search-property', 'Search Property', 'search property.md', endpoints.propertySearch, 'feature'],
  ['sales', 'Sales', 'sales.md', endpoints.sales, 'feature'],
  ['admins', 'Admins', 'admin.md', [], 'feature'],
  ['add-location', 'Add Location', 'addlocation.md', endpoints.locations, 'feature'],
  ['crm', 'CRM', 'crm.md', endpoints.crm, 'feature'],
  ['analytics', 'Analytics', 'analytics.md', endpoints.analytics, 'dashboard'],
  ['map', 'Map', 'map.md', endpoints.map, 'map'],
  ['chat', 'Chat', 'chat.md', endpoints.chat, 'chat'],
] as Array<readonly [string, string, string, FeatureEndpoint[], FeatureDefinition['component']]>;

export const roleFeatureSlugs: Record<Role, readonly string[]> = {
  superadmin: [
    'followup',
    'search-property',
    'add-property',
    'sales',
    'admins',
    'add-location',
    'crm',
    'analytics',
    'map',
    'chat',
  ],
  admin: ['followup', 'search-property', 'add-property', 'sales', 'admins', 'crm', 'analytics', 'map', 'chat'],
  subadmin: ['followup', 'search-property', 'add-property', 'sales', 'add-location', 'crm', 'analytics', 'map', 'chat', 'subscription'],
  employee: ['followup', 'search-property', 'add-property', 'sales', 'add-location', 'crm', 'analytics', 'map', 'chat'],
};

export function normalizeRole(role: Role, rawRole?: string): Role {
  const value = rawRole?.toLowerCase().replace(/[_\s-]/g, '') ?? role;
  if (value.includes('super')) return 'superadmin';
  if (value.includes('sub')) return 'subadmin';
  if (value.includes('employee')) return 'employee';
  if (value.includes('admin')) return 'admin';
  return role;
}

export function roleFromUser(rawRole?: string, fallback: Role = 'employee'): Role {
  return normalizeRole(fallback, rawRole);
}

function definition(role: Role, slug: string, title: string, file: string, baseEndpoints: FeatureEndpoint[], component: FeatureDefinition['component']): FeatureDefinition {
  const roleSpecific = slug === 'admins'
    ? [...roleEndpoints[role].admin, ...roleEndpoints[role].subadmin, ...roleEndpoints[role].employees]
    : [];
  const allEndpoints = [...baseEndpoints, ...roleSpecific];
  const hiddenMutations = role === 'employee' || (role === 'subadmin' && ['admins', 'employees', 'add-location'].includes(slug));
  const route = `/${role}/${slug}`;
  return {
    id: `${role}-${slug}`,
    role,
    title: `${roleLabels[role]} ${title}`,
    route,
    navLabel: title,
    planFile: `plan/${role}/${file}`,
    component,
    access: `${roleLabels[role]} scoped`,
    summary: `${title} migrated from Flutter plan coverage and connected to Spring endpoints.`,
    primaryEndpoint: allEndpoints.find((endpoint) => endpoint.method === 'GET') ?? allEndpoints[0],
    endpoints: allEndpoints,
    mutations: hiddenMutations ? [] : allEndpoints.filter((endpoint) => endpoint.method !== 'GET' && endpoint.method !== 'WS'),
    hiddenMutations,
    verification: allEndpoints.length ? 'implemented' : 'partial',
    fallback: allEndpoints.length ? undefined : 'UI is route-complete; backend only exposes current profile for this role.',
  };
}

export const featureDefinitions: FeatureDefinition[] = (['superadmin', 'admin', 'subadmin', 'employee'] as Role[]).flatMap((role) =>
  featureMap.map(([slug, title, file, baseEndpoints, component]) => definition(role, slug, title, file, baseEndpoints, component)),
);

export const subadminSignupFeatures: FeatureDefinition[] = [
  {
    id: 'subadmin-signup',
    role: 'subadmin',
    title: 'Sub Admin Signup',
    route: '/signup/subadmin',
    navLabel: 'Signup',
    planFile: 'plan/subadmin/signup.md',
    component: 'signup',
    access: 'Public registration',
    summary: 'Registration-first signup with email check, temp registration, KYC data, Razorpay order, backend verification, and resume status.',
    primaryEndpoint: endpoints.subadminSignup[0],
    endpoints: endpoints.subadminSignup,
    mutations: endpoints.subadminSignup.filter((endpoint) => endpoint.method !== 'GET'),
    verification: 'wired',
  },
  {
    id: 'subadmin-razorpay',
    role: 'subadmin',
    title: 'Sub Admin Razorpay',
    route: '/signup/razorpay',
    navLabel: 'Razorpay',
    planFile: 'plan/subadmin/razorpay.md',
    component: 'signup',
    access: 'Public payment verification',
    summary: 'Razorpay checkout and renewal actions always verify with backend before success state.',
    primaryEndpoint: endpoints.razorpay[0],
    endpoints: endpoints.razorpay,
    mutations: endpoints.razorpay.filter((endpoint) => endpoint.method !== 'GET'),
    verification: 'wired',
  },
];

export const allCoverage = [...featureDefinitions, ...subadminSignupFeatures];

export function featuresForRole(role: Role) {
  const allowed = new Set(roleFeatureSlugs[role]);
  return featureDefinitions.filter((feature) => feature.role === role && allowed.has(feature.route.split('/').pop() ?? ''));
}

export function canAccessRolePath(role: Role, slug?: string) {
  if (!slug) return true;
  const canonicalSlug =
    slug === 'properties'
      ? 'add-property'
      : slug === 'locations'
        ? 'add-location'
        : slug === 'project-documents'
          ? 'search-property'
          : slug === 'subadmins' || slug === 'employees'
            ? 'admins'
            : slug;
  return roleFeatureSlugs[role].includes(canonicalSlug);
}

export function defaultRouteForRole(role: Role) {
  return `/${role}/followup`;
}
