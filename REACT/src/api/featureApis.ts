import { estateApi } from './estateApi';

export const authApi = estateApi.auth;
export const dashboardApi = estateApi.dashboard;
export const projectApi = estateApi.projects;
export const leadCrmApi = {
  leads: estateApi.leads,
  followUps: estateApi.followUps,
};
export const salesApi = estateApi.sales;
export const locationApi = estateApi.locations;
export const userAdminApi = estateApi.users;
export const employeeApi = estateApi.employees;
export const chatApi = estateApi.chat;
export const paymentApi = estateApi.payments;
export const subscriptionApi = estateApi.subscription;
export const documentApi = estateApi.documents;
export const searchApi = {
  global: estateApi.globalSearch,
  root: estateApi.search,
  chatGlobal: estateApi.chat.globalSearch,
};
export const kycApi = {
  patch: estateApi.users.superadmin.patchKyc,
  update: estateApi.users.superadmin.updateKyc,
  uploadTemp: estateApi.kyc.uploadTemp,
  uploadUser: estateApi.kyc.uploadUser,
  documentBlob: estateApi.kyc.documentBlob,
};
export const subadminRegistrationApi = estateApi.subadminRegistration;
