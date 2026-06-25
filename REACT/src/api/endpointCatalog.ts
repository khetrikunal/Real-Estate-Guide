import type { HttpMethod } from '../types/domain';

export type ApiFeatureKey =
  | 'auth'
  | 'dashboard'
  | 'projects'
  | 'leads'
  | 'followUps'
  | 'sales'
  | 'locations'
  | 'documents'
  | 'users'
  | 'employees'
  | 'kyc'
  | 'chat'
  | 'subadminRegistration'
  | 'payments'
  | 'subscription'
  | 'search';

export interface ApiEndpointDefinition {
  feature: ApiFeatureKey;
  name: string;
  method: Exclude<HttpMethod, 'WS'>;
  path: string;
}

export const apiEndpointCatalog = [
  { feature: 'auth', name: 'login', method: 'POST', path: '/auth/login' },
  { feature: 'auth', name: 'register', method: 'POST', path: '/auth/register' },
  { feature: 'auth', name: 'me', method: 'GET', path: '/auth/me' },
  { feature: 'auth', name: 'forgotSendOtp', method: 'POST', path: '/auth/forgot-password/send-otp' },
  { feature: 'auth', name: 'forgotVerifyOtp', method: 'POST', path: '/auth/forgot-password/verify-otp' },
  { feature: 'auth', name: 'forgotReset', method: 'POST', path: '/auth/forgot-password/reset-password' },
  { feature: 'auth', name: 'changePassword', method: 'POST', path: '/auth/change-password' },
  { feature: 'auth', name: 'updateProfile', method: 'PUT', path: '/auth/update-profile' },
  { feature: 'auth', name: 'refreshFirebaseToken', method: 'POST', path: '/auth/refresh-firebase-token' },
  { feature: 'dashboard', name: 'stats', method: 'GET', path: '/dashboard/stats' },
  { feature: 'dashboard', name: 'activity', method: 'GET', path: '/dashboard/activity' },
  { feature: 'projects', name: 'list', method: 'GET', path: '/projects' },
  { feature: 'projects', name: 'search', method: 'GET', path: '/projects/search' },
  { feature: 'projects', name: 'detail', method: 'GET', path: '/projects/{id}' },
  { feature: 'projects', name: 'byBroker', method: 'GET', path: '/projects/broker/{id}' },
  { feature: 'projects', name: 'byEmployee', method: 'GET', path: '/projects/employee/{id}' },
  { feature: 'projects', name: 'byUploader', method: 'GET', path: '/projects/uploader/{id}' },
  { feature: 'projects', name: 'create', method: 'POST', path: '/projects/create' },
  { feature: 'projects', name: 'update', method: 'PUT', path: '/projects/{id}' },
  { feature: 'projects', name: 'patch', method: 'PATCH', path: '/projects/{id}' },
  { feature: 'projects', name: 'remove', method: 'DELETE', path: '/projects/{id}' },
  { feature: 'projects', name: 'sell', method: 'POST', path: '/projects/{id}/sell' },
  { feature: 'projects', name: 'documents', method: 'GET', path: '/documents/{projectId}' },
  { feature: 'projects', name: 'uploadDocument', method: 'POST', path: '/documents/upload/{projectId}' },
  { feature: 'projects', name: 'uploadCover', method: 'POST', path: '/projects/{id}/cover-photo' },
  { feature: 'projects', name: 'downloadDocumentUrl', method: 'GET', path: '/documents/download/{documentId}' },
  { feature: 'projects', name: 'deleteDocument', method: 'DELETE', path: '/documents/{documentId}' },
  { feature: 'projects', name: 'byCity', method: 'GET', path: '/projects/city/{city}' },
  { feature: 'projects', name: 'projectDocuments', method: 'GET', path: '/projects/{id}/documents' },
  { feature: 'leads', name: 'list', method: 'GET', path: '/leads/all' },
  { feature: 'leads', name: 'create', method: 'POST', path: '/leads/create' },
  { feature: 'leads', name: 'assign', method: 'POST', path: '/leads/assign' },
  { feature: 'leads', name: 'updateStatus', method: 'POST', path: '/leads/update-status' },
  { feature: 'leads', name: 'stats', method: 'GET', path: '/leads/stats' },
  { feature: 'leads', name: 'remove', method: 'DELETE', path: '/leads/delete/{id}' },
  { feature: 'followUps', name: 'dashboard', method: 'GET', path: '/crm/follow-ups/dashboard' },
  { feature: 'followUps', name: 'pendingCount', method: 'GET', path: '/crm/follow-ups/pending-count' },
  { feature: 'followUps', name: 'byLead', method: 'GET', path: '/crm/leads/{leadId}/follow-ups' },
  { feature: 'followUps', name: 'create', method: 'POST', path: '/crm/leads/{leadId}/follow-ups' },
  { feature: 'followUps', name: 'complete', method: 'PATCH', path: '/crm/follow-ups/{id}/complete' },
  { feature: 'followUps', name: 'reschedule', method: 'PATCH', path: '/crm/follow-ups/{id}/reschedule' },
  { feature: 'followUps', name: 'remove', method: 'DELETE', path: '/crm/follow-ups/{id}' },
  { feature: 'sales', name: 'list', method: 'GET', path: '/sales' },
  { feature: 'sales', name: 'record', method: 'POST', path: '/sales/record' },
  { feature: 'sales', name: 'analytics', method: 'GET', path: '/sales/analytics' },
  { feature: 'sales', name: 'performance', method: 'GET', path: '/sales/performance' },
  { feature: 'locations', name: 'list', method: 'GET', path: '/locations' },
  { feature: 'locations', name: 'detail', method: 'GET', path: '/locations/{id}' },
  { feature: 'locations', name: 'create', method: 'POST', path: '/locations' },
  { feature: 'locations', name: 'update', method: 'PUT', path: '/locations/{id}' },
  { feature: 'locations', name: 'remove', method: 'DELETE', path: '/locations/{id}' },
  { feature: 'locations', name: 'cities', method: 'GET', path: '/locations/cities' },
  { feature: 'locations', name: 'createCity', method: 'POST', path: '/locations/cities' },
  { feature: 'locations', name: 'rate', method: 'GET', path: '/locations/rate' },
  { feature: 'locations', name: 'resolveMapUrl', method: 'GET', path: '/locations/resolve-map-url' },
  { feature: 'locations', name: 'areas', method: 'GET', path: '/areas' },
  { feature: 'locations', name: 'areasByCity', method: 'GET', path: '/areas' },
  { feature: 'locations', name: 'createArea', method: 'POST', path: '/areas' },
  { feature: 'locations', name: 'deleteArea', method: 'DELETE', path: '/areas/{id}' },
  { feature: 'documents', name: 'byProject', method: 'GET', path: '/documents/{projectId}' },
  { feature: 'documents', name: 'upload', method: 'POST', path: '/documents/upload/{projectId}' },
  { feature: 'documents', name: 'remove', method: 'DELETE', path: '/documents/{documentId}' },
  { feature: 'documents', name: 'download', method: 'GET', path: '/documents/download/{documentId}' },
  { feature: 'documents', name: 'configDocs', method: 'GET', path: '/documents/config/{configId}' },
  { feature: 'documents', name: 'uploadConfigDocs', method: 'POST', path: '/documents/upload/config/{configId}' },
  { feature: 'documents', name: 'deleteConfigDoc', method: 'DELETE', path: '/documents/config/{configId}/{documentId}' },
  { feature: 'documents', name: 'uploadCover', method: 'POST', path: '/documents/upload/cover/{projectId}' },
  { feature: 'documents', name: 'byUploader', method: 'GET', path: '/documents/uploader/{uploadedBy}' },
  { feature: 'users', name: 'detail', method: 'GET', path: '/users/{id}' },
  { feature: 'users', name: 'updateProfile', method: 'PATCH', path: '/users/{id}' },
  { feature: 'users', name: 'superadminUsers', method: 'GET', path: '/superadmin/users' },
  { feature: 'users', name: 'superadminAdmins', method: 'GET', path: '/superadmin/admins' },
  { feature: 'users', name: 'superadminSubadmins', method: 'GET', path: '/superadmin/subadmins' },
  { feature: 'users', name: 'recentSubadmins', method: 'GET', path: '/superadmin/recent-subadmins' },
  { feature: 'users', name: 'addedByMeSubadmins', method: 'GET', path: '/superadmin/subadmins/added-by-me' },
  { feature: 'users', name: 'selfSignedSubadmins', method: 'GET', path: '/superadmin/subadmins/self-signed-up' },
  { feature: 'users', name: 'superadminEmployees', method: 'GET', path: '/superadmin/employees' },
  { feature: 'users', name: 'createAdmin', method: 'POST', path: '/superadmin/create-admin' },
  { feature: 'users', name: 'createSubadmin', method: 'POST', path: '/superadmin/create-subadmin' },
  { feature: 'users', name: 'createEmployee', method: 'POST', path: '/superadmin/create-employee' },
  { feature: 'users', name: 'addAdmin', method: 'POST', path: '/superadmin/admins' },
  { feature: 'users', name: 'addSubadmin', method: 'POST', path: '/superadmin/subadmins' },
  { feature: 'users', name: 'addEmployee', method: 'POST', path: '/superadmin/employees' },
  { feature: 'users', name: 'deleteUser', method: 'DELETE', path: '/superadmin/users/{id}' },
  { feature: 'users', name: 'deleteAdmin', method: 'DELETE', path: '/superadmin/admins/{id}' },
  { feature: 'users', name: 'deleteSubadmin', method: 'DELETE', path: '/superadmin/subadmins/{id}' },
  { feature: 'users', name: 'deleteEmployee', method: 'DELETE', path: '/superadmin/employees/{id}' },
  { feature: 'users', name: 'updateSubadmin', method: 'PATCH', path: '/superadmin/subadmins/{id}' },
  { feature: 'users', name: 'patchKyc', method: 'PATCH', path: '/superadmin/users/{id}/kyc' },
  { feature: 'users', name: 'adminDetail', method: 'GET', path: '/superadmin/admins/{id}/detail' },
  { feature: 'users', name: 'subadminDetail', method: 'GET', path: '/superadmin/subadmins/{id}' },
  { feature: 'users', name: 'employeeDetail', method: 'GET', path: '/superadmin/employees/{id}/detail' },
  { feature: 'users', name: 'adminSubadmins', method: 'GET', path: '/admin/subadmins' },
  { feature: 'users', name: 'adminAddedSubadmins', method: 'GET', path: '/admin/subadmins/added' },
  { feature: 'users', name: 'adminSelfSignedSubadmins', method: 'GET', path: '/admin/subadmins/self-signed-up' },
  { feature: 'users', name: 'adminEmployees', method: 'GET', path: '/admin/employees' },
  { feature: 'users', name: 'adminCreateSubadmin', method: 'POST', path: '/admin/subadmins' },
  { feature: 'users', name: 'adminCreateEmployee', method: 'POST', path: '/admin/employees' },
  { feature: 'users', name: 'adminSubadminDetail', method: 'GET', path: '/admin/subadmins/{id}' },
  { feature: 'users', name: 'adminEmployeeDetail', method: 'GET', path: '/admin/employees/{id}/detail' },
  { feature: 'users', name: 'adminUpdateEmployee', method: 'PATCH', path: '/admin/employees/{id}' },
  { feature: 'users', name: 'adminDeleteEmployee', method: 'DELETE', path: '/admin/employees/{id}' },
  { feature: 'employees', name: 'list', method: 'GET', path: '/employees' },
  { feature: 'employees', name: 'create', method: 'POST', path: '/employees' },
  { feature: 'employees', name: 'update', method: 'PUT', path: '/employees/{id}' },
  { feature: 'employees', name: 'remove', method: 'DELETE', path: '/employees/{id}' },
  { feature: 'kyc', name: 'uploadTemp', method: 'POST', path: '/kyc/uploads/temp/{token}' },
  { feature: 'kyc', name: 'uploadUser', method: 'POST', path: '/kyc/uploads/users/{userId}' },
  { feature: 'kyc', name: 'document', method: 'GET', path: '/kyc/documents/{documentId}' },
  { feature: 'chat', name: 'conversations', method: 'GET', path: '/chat/conversations' },
  { feature: 'chat', name: 'messages', method: 'GET', path: '/chat/conversations/{conversationId}/messages' },
  { feature: 'chat', name: 'createConversation', method: 'POST', path: '/chat/conversations' },
  { feature: 'chat', name: 'deleteConversation', method: 'DELETE', path: '/chat/conversations/{conversationId}' },
  { feature: 'chat', name: 'markRead', method: 'POST', path: '/chat/conversations/{conversationId}/read' },
  { feature: 'chat', name: 'searchMessages', method: 'GET', path: '/chat/search/messages' },
  { feature: 'chat', name: 'globalSearch', method: 'GET', path: '/chat/search/global' },
  { feature: 'chat', name: 'searchUsers', method: 'GET', path: '/chat/users/search' },
  { feature: 'chat', name: 'upsertUser', method: 'POST', path: '/chat/users/upsert' },
  { feature: 'chat', name: 'upload', method: 'POST', path: '/chat/upload' },
  { feature: 'chat', name: 'files', method: 'GET', path: '/chat/files/{filename}' },
  { feature: 'chat', name: 'presence', method: 'POST', path: '/chat/presence' },
  { feature: 'chat', name: 'fcmToken', method: 'POST', path: '/chat/fcm-token' },
  { feature: 'chat', name: 'iceConfig', method: 'GET', path: '/chat/calls/ice-config' },
  { feature: 'chat', name: 'react', method: 'POST', path: '/chat/messages/{messageId}/react' },
  { feature: 'chat', name: 'removeReaction', method: 'DELETE', path: '/chat/messages/{messageId}/react' },
  { feature: 'chat', name: 'reactions', method: 'GET', path: '/chat/messages/{messageId}/reactions' },
  { feature: 'chat', name: 'editMessage', method: 'PATCH', path: '/chat/messages/{messageId}' },
  { feature: 'chat', name: 'deleteMessage', method: 'DELETE', path: '/chat/messages/{messageId}' },
  { feature: 'subadminRegistration', name: 'checkEmail', method: 'GET', path: '/subadmin/check-email' },
  { feature: 'subadminRegistration', name: 'initiate', method: 'POST', path: '/subadmin/initiate-registration' },
  { feature: 'subadminRegistration', name: 'status', method: 'GET', path: '/subadmin/registration-status' },
  { feature: 'subadminRegistration', name: 'verifyAndComplete', method: 'POST', path: '/payments/verify-and-complete' },
  { feature: 'subadminRegistration', name: 'markFailed', method: 'POST', path: '/payments/mark-failed' },
  { feature: 'payments', name: 'createOrder', method: 'POST', path: '/payment/create-order' },
  { feature: 'payments', name: 'verify', method: 'POST', path: '/payment/verify' },
  { feature: 'payments', name: 'bySubadmin', method: 'GET', path: '/payment/by-subadmin/{subAdminId}' },
  { feature: 'payments', name: 'renew', method: 'POST', path: '/payment/renew' },
  { feature: 'payments', name: 'verifyRenewal', method: 'POST', path: '/payment/renew/verify' },
  { feature: 'subscription', name: 'subscribe', method: 'POST', path: '/subscription/subscribe' },
  { feature: 'subscription', name: 'status', method: 'GET', path: '/subscription/status/{userId}' },
  { feature: 'subscription', name: 'detail', method: 'GET', path: '/subscription/{userId}' },
  { feature: 'search', name: 'root', method: 'GET', path: '/search' },
  { feature: 'search', name: 'global', method: 'GET', path: '/search/global' },
] as const satisfies readonly ApiEndpointDefinition[];

export function endpointKey(endpoint: Pick<ApiEndpointDefinition, 'method' | 'path'>) {
  return `${endpoint.method} ${endpoint.path}`;
}

export function flattenEndpointCatalog() {
  return [...apiEndpointCatalog];
}

export function endpointsByFeature(feature: ApiFeatureKey) {
  return apiEndpointCatalog.filter((endpoint) => endpoint.feature === feature);
}
