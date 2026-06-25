import type {
  ApiUser,
  Area,
  Conversation,
  DashboardStats,
  FollowUp,
  FollowUpDashboard,
  Lead,
  Location,
  Message,
  Project,
  ProjectDocument,
  Sale,
  UserRecord,
} from './domain';

export type EntityId = string | number;
export type IsoDate = string;
export type IsoDateTime = string;
export type ApiRecord = Record<string, unknown>;

export interface ApiMessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  content?: T[];
  items?: T[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}

export interface LoginResponse {
  token?: string;
  jwt?: string;
  firebaseToken?: string | null;
  role?: string;
  userId?: number;
  name?: string;
  email?: string;
  user?: ApiUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  razorpayPaymentId?: string;
  profilePhotoUrl?: string;
  aadhaarNumber?: string;
  aadhaarCardUrl?: string;
  panNumber?: string;
}

export interface ForgotPasswordSendOtpRequest {
  email: string;
}

export interface ForgotPasswordVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordResetRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  profilePhotoUrl?: string;
}

export type DashboardStatsResponse = DashboardStats;

export interface ActivityResponse {
  id: number;
  type: string;
  description: string;
  userName?: string;
  projectName?: string;
  city?: string;
  timestamp?: IsoDateTime;
}

export interface ProjectConfigDTO {
  id?: number;
  projectId?: number;
  name?: string;
  configurationName?: string;
  bhk?: string;
  carpetArea?: number;
  builtUpArea?: number;
  price?: number;
  totalUnits?: number;
  availableUnits?: number;
  units?: ProjectUnitDTO[];
  [key: string]: unknown;
}

export interface ProjectUnitDTO {
  id?: number;
  projectId?: number;
  configId?: number;
  unitLabel?: string;
  unitNo?: string;
  floorNo?: string;
  status?: string;
  soldAt?: IsoDateTime;
  saleId?: number;
}

export interface CreateProjectRequest {
  projectName: string;
  locationId?: number;
  description?: string;
  uploadedBy?: number;
  address?: string;
  city?: string;
  area?: string;
  state?: string;
  zipCode?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  configs?: ProjectConfigDTO[];
}

export type ProjectRequest = CreateProjectRequest;
export type ProjectResponse = Project;

export interface SellProjectRequest {
  configurationId?: number;
  unitId?: number;
  unitsSold?: number;
  buyerName?: string;
  notes?: string;
}

export type ProjectDocumentResponse = ProjectDocument;

export interface CreateLeadRequest {
  customerName: string;
  phone: string;
  email?: string;
  propertyInterest?: string;
  projectId?: number;
  configId?: number;
}

export interface AssignLeadRequest {
  leadId: number;
  employeeId: number;
}

export interface UpdateLeadStatusRequest {
  leadId: number;
  status: string;
}

export interface LeadStatsResponse {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  interested: number;
  closed: number;
}

export interface CreateFollowUpRequest {
  ownerUserId: number;
  callingType: string;
  description?: string;
  scheduledAt: IsoDateTime;
}

export interface RescheduleFollowUpRequest {
  scheduledAt: IsoDateTime;
}

export interface CompleteFollowUpRequest {
  completionNote?: string;
}

export type FollowUpResponse = FollowUp;
export type FollowUpDashboardResponse = FollowUpDashboard;

export interface SaleRecordRequest {
  projectId: number;
  buyerName: string;
  amount: number;
  unitId?: number;
  notes?: string;
}

export type SaleRecordResponse = Sale;

export interface MonthlySales {
  month: string;
  totalSales: number;
  totalTransactions?: number;
}

export interface SalesAnalyticsResponse {
  totalSales: number;
  totalTransactions: number;
  monthlySales: MonthlySales[];
}

export interface SalesPerformancePointResponse {
  label?: string;
  date?: IsoDate;
  sales?: number;
  transactions?: number;
}

export interface SalesPerformanceSeriesResponse {
  name: string;
  points: SalesPerformancePointResponse[];
}

export interface SalesPerformanceResponse {
  series?: SalesPerformanceSeriesResponse[];
  points?: SalesPerformancePointResponse[];
}

export interface LocationRequest {
  locationName?: string;
  city: string;
  state: string;
  area?: string;
  subscriptionRate?: number;
}

export interface CustomCityRequest {
  state: string;
  city: string;
}

export interface CustomCityResponse {
  id?: number;
  state?: string;
  city?: string;
}

export interface AreaRequest {
  name: string;
  city: string;
  state?: string;
}

export type LocationResponse = Location;
export type AreaResponse = Area;

export interface MapUrlResolveResponse {
  latitude: number;
  longitude: number;
  resolvedUrl: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  profilePhotoUrl?: string;
  aadhaarNumber?: string;
  aadhaarCardUrl?: string;
  panNumber?: string;
}

export interface EmployeeRequest extends CreateUserRequest {
  adminId?: number;
}

export type CreateEmployeeRequest = Pick<CreateUserRequest, 'name' | 'email' | 'phone'>;
export type UserManagementResponse = UserRecord;

export interface KycDocumentResponse {
  id?: number;
  userId?: number;
  documentType?: string;
  documentUrl?: string;
  status?: string;
  uploadedAt?: IsoDateTime;
}

export interface UpdateKycStatusRequest {
  kycStatus: string;
  rejectionReason?: string;
}

export interface ParticipantDTO {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  profilePhotoUrl?: string;
  isOnline?: boolean;
}

export interface ChatMessageDTO extends Omit<Message, 'conversationId'> {
  conversationId: string;
  senderId?: string;
  body?: string;
  type?: string;
}

export interface ConversationDTO extends Omit<Conversation, 'lastMessage'> {
  participants?: ParticipantDTO[];
  lastMessage?: string | ApiRecord;
  lastMessageAt?: IsoDateTime;
  unreadCount?: number;
}

export interface ReadDTO {
  conversationId: string;
  messageIds?: string[];
}

export interface TypingDTO {
  conversationId: string;
  isTyping: boolean;
}

export interface MessageSearchResultDTO {
  messageId: string;
  conversationId: string;
  conversationTitle?: string;
  bodyPreview?: string;
  query?: string;
  senderName?: string;
  senderAvatar?: string;
  sentAt?: IsoDateTime;
}

export interface GlobalSearchResultDTO {
  messages?: MessageSearchResultDTO[];
  conversations?: ConversationDTO[];
  contacts?: ApiRecord[];
}

export interface CreateOrderRequest {
  amountInPaise: number;
  currency: string;
  planType?: string;
  assignedCity?: string;
  assignedState?: string;
  assignedArea?: string;
  subscriptionRate?: number;
}

export interface CreateOrderResponse {
  orderId: string;
  amountInPaise: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  razorpayPaymentId?: string;
  message?: string;
}

export interface VerifyAndCompleteRequest extends VerifyPaymentRequest {
  registrationToken: string;
}

export interface SubscribeRequest {
  userId: number;
  planType: string;
  price: number;
  locationIds: number[];
}

export interface SubscriptionStatusResponse {
  active?: boolean;
  status?: string;
  planType?: string;
  subscriptionStartAt?: IsoDate;
  subscriptionExpiresAt?: IsoDate;
}
