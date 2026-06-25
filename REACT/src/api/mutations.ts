import type { UseMutationOptions } from '@tanstack/react-query';
import { estateApi } from './estateApi';
import type {
  AreaRequest,
  ChangePasswordRequest,
  CompleteFollowUpRequest,
  CreateFollowUpRequest,
  CreateLeadRequest,
  CreateOrderRequest,
  CreateProjectRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RescheduleFollowUpRequest,
  SaleRecordRequest,
  SellProjectRequest,
  SubscribeRequest,
  UpdateKycStatusRequest,
  UpdateLeadStatusRequest,
  UpdateProfileRequest,
  VerifyAndCompleteRequest,
  VerifyPaymentRequest,
} from '../types/api-contracts';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables, unknown>,
  'mutationFn'
>;

function mutationOptions<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: MutationOptions<TData, TVariables>,
) {
  return { mutationFn, ...options } satisfies UseMutationOptions<TData, Error, TVariables, unknown>;
}

const asApiBody = (body: object) => body as Record<string, unknown>;

type IdVariables = { id: string | number };
type BodyVariables<TBody> = { body: TBody };
type IdBodyVariables<TBody> = IdVariables & BodyVariables<TBody>;

export const mutationWrappers = {
  auth: {
    login: (options?: MutationOptions<LoginResponse, LoginRequest>) =>
      mutationOptions((body: LoginRequest) => estateApi.auth.login(body), options),
    register: (options?: MutationOptions<unknown, RegisterRequest>) =>
      mutationOptions((body: RegisterRequest) => estateApi.auth.register(asApiBody(body)), options),
    changePassword: (options?: MutationOptions<unknown, ChangePasswordRequest>) =>
      mutationOptions((body: ChangePasswordRequest) => estateApi.auth.changePassword(asApiBody(body)), options),
    updateProfile: (options?: MutationOptions<unknown, UpdateProfileRequest>) =>
      mutationOptions((body: UpdateProfileRequest) => estateApi.auth.updateProfile(asApiBody(body)), options),
  },
  projects: {
    create: (options?: MutationOptions<unknown, CreateProjectRequest>) =>
      mutationOptions((body: CreateProjectRequest) => estateApi.projects.create(asApiBody(body)), options),
    update: (options?: MutationOptions<unknown, IdBodyVariables<CreateProjectRequest>>) =>
      mutationOptions(({ id, body }) => estateApi.projects.update(id, asApiBody(body)), options),
    patch: (options?: MutationOptions<unknown, IdBodyVariables<Partial<CreateProjectRequest>>>) =>
      mutationOptions(({ id, body }) => estateApi.projects.patch(id, asApiBody(body)), options),
    remove: (options?: MutationOptions<unknown, IdVariables>) =>
      mutationOptions(({ id }) => estateApi.projects.remove(id), options),
    sell: (options?: MutationOptions<unknown, IdBodyVariables<SellProjectRequest>>) =>
      mutationOptions(({ id, body }) => estateApi.projects.sell(id, asApiBody(body)), options),
  },
  leads: {
    create: (options?: MutationOptions<unknown, CreateLeadRequest>) =>
      mutationOptions((body: CreateLeadRequest) => estateApi.leads.create(asApiBody(body)), options),
    assign: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.leads.assign(body), options),
    updateStatus: (options?: MutationOptions<unknown, UpdateLeadStatusRequest>) =>
      mutationOptions((body: UpdateLeadStatusRequest) => estateApi.leads.updateStatus(asApiBody(body)), options),
    remove: (options?: MutationOptions<unknown, IdVariables>) =>
      mutationOptions(({ id }) => estateApi.leads.remove(id), options),
  },
  followUps: {
    create: (options?: MutationOptions<unknown, { leadId: string | number; body: CreateFollowUpRequest }>) =>
      mutationOptions(({ leadId, body }) => estateApi.followUps.create(leadId, asApiBody(body)), options),
    complete: (options?: MutationOptions<unknown, IdVariables & Partial<BodyVariables<CompleteFollowUpRequest>>>) =>
      mutationOptions(({ id }) => estateApi.followUps.complete(id), options),
    reschedule: (options?: MutationOptions<unknown, IdBodyVariables<RescheduleFollowUpRequest>>) =>
      mutationOptions(({ id, body }) => estateApi.followUps.reschedule(id, asApiBody(body)), options),
    remove: (options?: MutationOptions<unknown, IdVariables>) =>
      mutationOptions(({ id }) => estateApi.followUps.remove(id), options),
  },
  sales: {
    record: (options?: MutationOptions<unknown, SaleRecordRequest>) =>
      mutationOptions((body: SaleRecordRequest) => estateApi.sales.record(asApiBody(body)), options),
  },
  locations: {
    create: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.locations.create(body), options),
    update: (options?: MutationOptions<unknown, IdBodyVariables<Record<string, unknown>>>) =>
      mutationOptions(({ id, body }) => estateApi.locations.update(id, body), options),
    remove: (options?: MutationOptions<unknown, IdVariables>) =>
      mutationOptions(({ id }) => estateApi.locations.remove(id), options),
    createArea: (options?: MutationOptions<unknown, AreaRequest>) =>
      mutationOptions((body: AreaRequest) => estateApi.locations.createArea(asApiBody(body)), options),
    deleteArea: (options?: MutationOptions<unknown, IdVariables>) =>
      mutationOptions(({ id }) => estateApi.locations.deleteArea(id), options),
  },
  documents: {
    remove: (options?: MutationOptions<unknown, IdVariables>) =>
      mutationOptions(({ id }) => estateApi.documents.remove(id), options),
    deleteConfigDoc: (
      options?: MutationOptions<unknown, { configId: string | number; docId: string | number }>,
    ) => mutationOptions(({ configId, docId }) => estateApi.documents.deleteConfigDoc(configId, docId), options),
  },
  users: {
    createAdmin: (options?: MutationOptions<unknown, CreateUserRequest>) =>
      mutationOptions((body: CreateUserRequest) => estateApi.users.superadmin.createAdmin(asApiBody(body)), options),
    createSubadmin: (options?: MutationOptions<unknown, CreateUserRequest>) =>
      mutationOptions((body: CreateUserRequest) => estateApi.users.superadmin.createSubadmin(asApiBody(body)), options),
    createEmployee: (options?: MutationOptions<unknown, CreateUserRequest>) =>
      mutationOptions((body: CreateUserRequest) => estateApi.users.superadmin.createEmployee(asApiBody(body)), options),
    patchKyc: (options?: MutationOptions<unknown, IdBodyVariables<UpdateKycStatusRequest>>) =>
      mutationOptions(({ id, body }) => estateApi.users.superadmin.patchKyc(id, asApiBody(body)), options),
    adminCreateEmployee: (options?: MutationOptions<unknown, CreateUserRequest>) =>
      mutationOptions((body: CreateUserRequest) => estateApi.users.admin.createEmployee(asApiBody(body)), options),
  },
  chat: {
    createConversation: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.chat.createConversation(body), options),
    markRead: (options?: MutationOptions<unknown, { conversationId: string }>) =>
      mutationOptions(({ conversationId }) => estateApi.chat.markRead(conversationId), options),
    presence: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.chat.presence(body), options),
    fcmToken: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.chat.fcmToken(body), options),
  },
  subadminRegistration: {
    initiate: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.subadminRegistration.initiate(body), options),
    verifyAndComplete: (options?: MutationOptions<unknown, VerifyAndCompleteRequest>) =>
      mutationOptions((body: VerifyAndCompleteRequest) => estateApi.subadminRegistration.verifyAndComplete(asApiBody(body)), options),
    markFailed: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.subadminRegistration.markFailed(body), options),
  },
  payments: {
    createOrder: (options?: MutationOptions<unknown, CreateOrderRequest>) =>
      mutationOptions((body: CreateOrderRequest) => estateApi.payments.createOrder(asApiBody(body)), options),
    verify: (options?: MutationOptions<unknown, VerifyPaymentRequest>) =>
      mutationOptions((body: VerifyPaymentRequest) => estateApi.payments.verify(asApiBody(body)), options),
    renew: (options?: MutationOptions<unknown, Record<string, unknown>>) =>
      mutationOptions((body) => estateApi.payments.renew(body), options),
    verifyRenewal: (options?: MutationOptions<unknown, VerifyPaymentRequest>) =>
      mutationOptions((body: VerifyPaymentRequest) => estateApi.payments.verifyRenewal(asApiBody(body)), options),
  },
  subscription: {
    subscribe: (options?: MutationOptions<unknown, SubscribeRequest>) =>
      mutationOptions((body: SubscribeRequest) => estateApi.subscription.subscribe(asApiBody(body)), options),
  },
} as const;
