import { apiBlob, apiRequest, upload } from './client';
import { tokenStore } from '../services/tokenStore';
import type { ApiUser, FollowUpDashboard } from '../types/domain';

function kycFormData(documentType: string, file: File) {
  const formData = new FormData();
  formData.set('documentType', documentType);
  formData.set('file', file);
  return formData;
}

const asQuery = (value: string | Record<string, string>, key: string) =>
  typeof value === 'string' ? { [key]: value } : value;

function downloadUrl(path: string) {
  const token = tokenStore.get();
  if (!token) return path;
  const params = new URLSearchParams({ token });
  return `${path}${path.includes('?') ? '&' : '?'}${params.toString()}`;
}

export const estateApi = {
  auth: {
    login: (body: { email: string; password: string; role?: string }) =>
      apiRequest<{ token?: string; jwt?: string; firebaseToken?: string | null; role?: string; userId?: number; name?: string; email?: string; user?: ApiUser }>('/auth/login', { method: 'POST', body }),
    register: (body: Record<string, unknown>) => apiRequest('/auth/register', { method: 'POST', body }),
    me: () => apiRequest<ApiUser>('/auth/me'),
    forgotSendOtp: (body: Record<string, unknown>) =>
      apiRequest('/auth/forgot-password/send-otp', { method: 'POST', body }),
    forgotVerifyOtp: (body: Record<string, unknown>) =>
      apiRequest('/auth/forgot-password/verify-otp', { method: 'POST', body }),
    forgotReset: (body: Record<string, unknown>) =>
      apiRequest('/auth/forgot-password/reset-password', { method: 'POST', body }),
    changePassword: (body: Record<string, unknown>) => apiRequest('/auth/change-password', { method: 'POST', body }),
    updateProfile: (body: Record<string, unknown>) => apiRequest('/auth/update-profile', { method: 'PUT', body }),
    refreshFirebaseToken: () => apiRequest('/auth/refresh-firebase-token', { method: 'POST' }),
  },
  dashboard: {
    stats: () => apiRequest('/dashboard/stats'),
    activity: () => apiRequest('/dashboard/activity'),
  },
  projects: {
    list: () => apiRequest<unknown[]>('/projects'),
    search: (query: string) => apiRequest('/projects/search', { query: { q: query } }),
    detail: (id: string | number) => apiRequest(`/projects/${id}`),
    byBroker: (brokerId: string | number) => apiRequest<unknown[]>(`/projects/broker/${brokerId}`),
    byEmployee: (employeeId: string | number) => apiRequest<unknown[]>(`/projects/employee/${employeeId}`),
    byUploader: (uploaderId: string | number) => apiRequest<unknown[]>(`/projects/uploader/${uploaderId}`),
    create: (body: Record<string, unknown>) => apiRequest('/projects/create', { method: 'POST', body }),
    update: (id: string | number, body: Record<string, unknown>) => apiRequest(`/projects/${id}`, { method: 'PUT', body }),
    patch: (id: string | number, body: Record<string, unknown>) => apiRequest(`/projects/${id}`, { method: 'PATCH', body }),
    remove: (id: string | number) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),
    sell: (id: string | number, body: Record<string, unknown>) => apiRequest(`/projects/${id}/sell`, { method: 'POST', body }),
    documents: (id: string | number) => apiRequest(`/documents/${id}`),
    uploadDocument: (projectId: string | number, formData: FormData) => upload(`/documents/upload/${projectId}`, formData),
    uploadCover: (projectId: string | number, formData: FormData) => upload(`/projects/${projectId}/cover-photo`, formData),
    downloadDocumentUrl: (docId: string | number) => downloadUrl(`/api/documents/download/${docId}`),
    deleteDocument: (docId: string | number) => apiRequest(`/documents/${docId}`, { method: 'DELETE' }),
    byCity: (city: string, area?: string) => apiRequest(`/projects/city/${encodeURIComponent(city)}${area ? `?area=${encodeURIComponent(area)}` : ''}`),
    projectDocuments: (id: string | number) => apiRequest(`/projects/${id}/documents`),
  },
  leads: {
    list: () => apiRequest<unknown[]>('/leads/all'),
    create: (body: Record<string, unknown>) => apiRequest('/leads/create', { method: 'POST', body }),
    assign: (body: Record<string, unknown>) => apiRequest('/leads/assign', { method: 'POST', body }),
    updateStatus: (body: Record<string, unknown>) => apiRequest('/leads/update-status', { method: 'POST', body }),
    stats: () => apiRequest('/leads/stats'),
    remove: (id: string | number) => apiRequest(`/leads/delete/${id}`, { method: 'DELETE' }),
  },
  followUps: {
    dashboard: () => apiRequest<FollowUpDashboard>('/crm/follow-ups/dashboard'),
    dashboardWindow: (query?: Record<string, string | number | boolean | undefined | null>) =>
      apiRequest<FollowUpDashboard>('/crm/follow-ups/dashboard', { query }),
    pendingCount: () => apiRequest('/crm/follow-ups/pending-count'),
    byLead: (leadId: string | number) => apiRequest(`/crm/leads/${leadId}/follow-ups`),
    create: (leadId: string | number, body: Record<string, unknown>) =>
      apiRequest(`/crm/leads/${leadId}/follow-ups`, { method: 'POST', body }),
    complete: (id: string | number, body?: Record<string, unknown>) => apiRequest(`/crm/follow-ups/${id}/complete`, { method: 'PATCH', body }),
    reschedule: (id: string | number, body: Record<string, unknown>) =>
      apiRequest(`/crm/follow-ups/${id}/reschedule`, { method: 'PATCH', body }),
    remove: (id: string | number) => apiRequest(`/crm/follow-ups/${id}`, { method: 'DELETE' }),
  },
  sales: {
    list: (role?: string) => apiRequest<unknown[]>('/sales', { query: { role } }),
    listFiltered: (query?: Record<string, string | number | boolean | undefined | null>) => apiRequest<unknown[]>('/sales', { query }),
    record: (body: Record<string, unknown>) => apiRequest('/sales/record', { method: 'POST', body }),
    analytics: () => apiRequest('/sales/analytics'),
    performance: () => apiRequest('/sales/performance'),
    performanceFiltered: (query?: Record<string, string | number | boolean | undefined | null>) => apiRequest('/sales/performance', { query }),
  },
  locations: {
    list: () => apiRequest('/locations'),
    detail: (id: string | number) => apiRequest(`/locations/${id}`),
    create: (body: Record<string, unknown>) => apiRequest('/locations', { method: 'POST', body }),
    update: (id: string | number, body: Record<string, unknown>) => apiRequest(`/locations/${id}`, { method: 'PUT', body }),
    remove: (id: string | number) => apiRequest(`/locations/${id}`, { method: 'DELETE' }),
    cities: (state?: string) => apiRequest('/locations/cities', { query: { state } }),
    createCity: (body: Record<string, unknown>) => apiRequest('/locations/cities', { method: 'POST', body }),
    rate: (city: string | Record<string, string>, state?: string, area?: string) =>
      apiRequest('/locations/rate', { query: typeof city === 'string' ? { city, state, area } : city }),
    resolveMapUrl: (url: string | Record<string, string>) =>
      apiRequest('/locations/resolve-map-url', { query: asQuery(url, 'url') }),
    areas: () => apiRequest('/areas'),
    areasByCity: (city: string, state?: string) => apiRequest('/areas', { query: { city, state } }),
    createArea: (body: Record<string, unknown>) => apiRequest('/areas', { method: 'POST', body }),
    deleteArea: (id: string | number) => apiRequest(`/areas/${id}`, { method: 'DELETE' }),
  },
  areas: {
    list: (city?: string, state?: string) => apiRequest('/areas', { query: { city, state } }),
  },
  documents: {
    byProject: (projectId: string | number) => apiRequest(`/documents/${projectId}`),
    upload: (projectId: string | number, formData: FormData) => upload(`/documents/upload/${projectId}`, formData),
    remove: (docId: string | number) => apiRequest(`/documents/${docId}`, { method: 'DELETE' }),
    download: (docId: string | number) => downloadUrl(`/api/documents/download/${docId}`),
    configDocs: (configId: string | number) => apiRequest(`/documents/config/${configId}`),
    uploadConfigDocs: (configId: string | number, formData: FormData) => upload(`/documents/upload/config/${configId}`, formData),
    deleteConfigDoc: (configId: string | number, docId: string | number) => apiRequest(`/documents/config/${configId}/${docId}`, { method: 'DELETE' }),
    uploadCover: (projectId: string | number, formData: FormData) => upload(`/documents/upload/cover/${projectId}`, formData),
    byUploader: (uploadedBy: string | number) => apiRequest(`/documents/uploader/${uploadedBy}`),
  },
  users: {
    detail: (id: string | number) => apiRequest(`/users/${id}`),
    updateProfile: (id: string | number, body: Record<string, unknown>) => apiRequest(`/users/${id}`, { method: 'PATCH', body }),
    selfSignedSubadmins: () => apiRequest('/superadmin/subadmins/self-signed-up'),
    superadmin: {
      users: () => apiRequest('/superadmin/users'),
      admins: () => apiRequest('/superadmin/admins'),
      subadmins: () => apiRequest('/superadmin/subadmins'),
      recentSubadmins: () => apiRequest('/superadmin/recent-subadmins'),
      addedByMeSubadmins: () => apiRequest('/superadmin/subadmins/added-by-me'),
      selfSignedSubadmins: () => apiRequest('/superadmin/subadmins/self-signed-up'),
      employees: () => apiRequest('/superadmin/employees'),
      createAdmin: (body: Record<string, unknown>) => apiRequest('/superadmin/create-admin', { method: 'POST', body }),
      createSubadmin: (body: Record<string, unknown>) => apiRequest('/superadmin/create-subadmin', { method: 'POST', body }),
      createEmployee: (body: Record<string, unknown>) => apiRequest('/superadmin/create-employee', { method: 'POST', body }),
      addAdmin: (body: Record<string, unknown>) => apiRequest('/superadmin/admins', { method: 'POST', body }),
      addSubadmin: (body: Record<string, unknown>) => apiRequest('/superadmin/subadmins', { method: 'POST', body }),
      addEmployee: (body: Record<string, unknown>) => apiRequest('/superadmin/employees', { method: 'POST', body }),
      deleteUser: (id: string | number) => apiRequest(`/superadmin/users/${id}`, { method: 'DELETE' }),
      deleteAdmin: (id: string | number) => apiRequest(`/superadmin/admins/${id}`, { method: 'DELETE' }),
      deleteSubadmin: (id: string | number) => apiRequest(`/superadmin/subadmins/${id}`, { method: 'DELETE' }),
      deleteEmployee: (id: string | number) => apiRequest(`/superadmin/employees/${id}`, { method: 'DELETE' }),
      updateSubadmin: (id: string | number, body: Record<string, unknown>) =>
        apiRequest(`/superadmin/subadmins/${id}`, { method: 'PATCH', body }),
      patchKyc: (id: string | number, body: Record<string, unknown>) =>
        apiRequest(`/superadmin/users/${id}/kyc`, { method: 'PATCH', body }),
      updateKyc: (userId: string | number, kycStatus: string) =>
        apiRequest(`/superadmin/users/${userId}/kyc`, { method: 'PATCH', body: { kycStatus } }),
      adminDetail: (id: string | number) => apiRequest(`/superadmin/admins/${id}/detail`),
      subadminDetail: (id: string | number) => apiRequest(`/superadmin/subadmins/${id}`),
      employeeDetail: (id: string | number) => apiRequest(`/superadmin/employees/${id}/detail`),
    },
    admin: {
      subadmins: () => apiRequest('/admin/subadmins'),
      addedSubadmins: () => apiRequest('/admin/subadmins/added'),
      selfSignedSubadmins: () => apiRequest('/admin/subadmins/self-signed-up'),
      employees: () => apiRequest('/admin/employees'),
      createSubadmin: (body: Record<string, unknown>) => apiRequest('/admin/subadmins', { method: 'POST', body }),
      createEmployee: (body: Record<string, unknown>) => apiRequest('/admin/employees', { method: 'POST', body }),
      subadminDetail: (id: string | number) => apiRequest(`/admin/subadmins/${id}`),
      employeeDetail: (id: string | number) => apiRequest(`/admin/employees/${id}/detail`),
      updateEmployee: (id: string | number, body: Record<string, unknown>) => apiRequest(`/admin/employees/${id}`, { method: 'PATCH', body }),
      deleteEmployee: (id: string | number) => apiRequest(`/admin/employees/${id}`, { method: 'DELETE' }),
    },
  },
  employees: {
    list: () => apiRequest('/employees'),
    create: (body: Record<string, unknown>) => apiRequest('/employees', { method: 'POST', body }),
    update: (id: string | number, body: Record<string, unknown>) => apiRequest(`/employees/${id}`, { method: 'PUT', body }),
    remove: (id: string | number) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
  },
  kyc: {
    uploadTemp: (token: string, documentType: string, file: File) =>
      upload(`/kyc/uploads/temp/${token}`, kycFormData(documentType, file)),
    uploadUser: (userId: string | number, documentType: string, file: File) =>
      upload(`/kyc/uploads/users/${userId}`, kycFormData(documentType, file)),
    documentBlob: (documentId: string | number) => apiBlob(`/kyc/documents/${documentId}`),
  },
  chat: {
    conversations: () => apiRequest('/chat/conversations'),
    messages: (conversationId: string, page = 0, size = 30) =>
      apiRequest(`/chat/conversations/${conversationId}/messages`, { query: { page, size } }),
    createConversation: (body: Record<string, unknown>) => apiRequest('/chat/conversations', { method: 'POST', body }),
    deleteConversation: (conversationId: string) => apiRequest(`/chat/conversations/${conversationId}`, { method: 'DELETE' }),
    markRead: (conversationId: string) => apiRequest(`/chat/conversations/${conversationId}/read`, { method: 'POST' }),
    searchMessages: (q: string, convId?: string, page = 0) =>
      apiRequest('/chat/search/messages', { query: { q, convId, page } }),
    globalSearch: (q: string) => apiRequest('/chat/search/global', { query: { q } }),
    searchUsers: (q: string) => apiRequest('/chat/users/search', { query: { q } }),
    upsertUser: (body: Record<string, unknown>) => apiRequest('/chat/users/upsert', { method: 'POST', body }),
    upload: (formData: FormData) => upload('/chat/upload', formData),
    presence: (body: Record<string, unknown>) => apiRequest('/chat/presence', { method: 'POST', body }),
    fcmToken: (body: Record<string, unknown>) => apiRequest('/chat/fcm-token', { method: 'POST', body }),
    iceConfig: () => apiRequest('/chat/calls/ice-config'),
    react: (messageId: string, emoji: string) =>
      apiRequest(`/chat/messages/${messageId}/react`, { method: 'POST', body: { emoji } }),
    removeReaction: (messageId: string) => apiRequest(`/chat/messages/${messageId}/react`, { method: 'DELETE' }),
    reactions: (messageId: string) => apiRequest(`/chat/messages/${messageId}/reactions`),
    editMessage: (messageId: string, content: string) =>
      apiRequest(`/chat/messages/${messageId}`, { method: 'PATCH', body: { content } }),
    deleteMessage: (messageId: string) => apiRequest(`/chat/messages/${messageId}`, { method: 'DELETE' }),
  },
  subadminRegistration: {
    checkEmail: (email: string) => apiRequest('/subadmin/check-email', { query: { email } }),
    initiate: (body: Record<string, unknown>) => apiRequest('/subadmin/initiate-registration', { method: 'POST', body }),
    status: (token: string) => apiRequest('/subadmin/registration-status', { query: { token } }),
    verifyAndComplete: (body: Record<string, unknown>) =>
      apiRequest('/payments/verify-and-complete', { method: 'POST', body }),
    markFailed: (body: Record<string, unknown>) => apiRequest('/payments/mark-failed', { method: 'POST', body }),
  },
  subadmin: {
    initiateRegistration: (body: Record<string, unknown>) =>
      apiRequest('/subadmin/initiate-registration', { method: 'POST', body }),
    checkEmail: (email: string) => apiRequest('/subadmin/check-email', { query: { email } }),
    registrationStatus: (token: string) => apiRequest('/subadmin/registration-status', { query: { token } }),
  },
  payments: {
    createOrder: (body: Record<string, unknown>) => apiRequest('/payment/create-order', { method: 'POST', body }),
    verify: (body: Record<string, unknown>) => apiRequest('/payment/verify', { method: 'POST', body }),
    verifyAndComplete: (body: Record<string, unknown>) => apiRequest('/payments/verify-and-complete', { method: 'POST', body }),
    bySubadmin: (id: string | number) => apiRequest(`/payment/by-subadmin/${id}`),
    renew: (body: Record<string, unknown>) => apiRequest('/payment/renew', { method: 'POST', body }),
    verifyRenewal: (body: Record<string, unknown>) => apiRequest('/payment/renew/verify', { method: 'POST', body }),
  },
  subscription: {
    subscribe: (body: Record<string, unknown>) => apiRequest('/subscription/subscribe', { method: 'POST', body }),
    status: (userId: string | number) => apiRequest(`/subscription/status/${userId}`),
    detail: (userId: string | number) => apiRequest(`/subscription/${userId}`),
  },
  subscriptions: {
    details: (userId: string | number) => apiRequest(`/subscription/${userId}`),
  },
  globalSearch: (q: string) => apiRequest('/search/global', { query: { q } }),
  search: (q: string) => apiRequest('/search', { query: { q } }),
};
