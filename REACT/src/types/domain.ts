export type Role = 'superadmin' | 'admin' | 'subadmin' | 'employee';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'WS';

export interface ApiUser {
  id?: number | string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  userRole?: string;
  location?: string;
  city?: string;
  assignedCity?: string;
  assignedArea?: string;
  subscriptionType?: 'location_based' | 'full' | string;
  subscriptionExpiresAt?: string;
  completionPercentage?: number;
  [key: string]: unknown;
}

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

export interface FeatureEndpoint {
  method: HttpMethod;
  path: string;
  label: string;
}

export interface FeatureDefinition {
  id: string;
  role: Role;
  title: string;
  route: string;
  navLabel: string;
  planFile: string;
  component: 'dashboard' | 'feature' | 'signup' | 'chat' | 'map';
  access: string;
  summary: string;
  primaryEndpoint?: FeatureEndpoint;
  endpoints: FeatureEndpoint[];
  mutations: FeatureEndpoint[];
  hiddenMutations?: boolean;
  verification: 'wired' | 'partial' | 'blocked' | 'implemented';
  fallback?: string;
}

export interface MetricCard {
  label: string;
  value: string;
  subtext: string;
  tone: 'green' | 'amber' | 'blue' | 'violet';
  emphasis?: boolean;
}

export interface ProjectUnit {
  id?: number | string;
  unitId?: number | string;
  configurationId?: number | string;
  unitNumber?: string;
  unitLabel?: string;
  unitNo?: string;
  status?: string;
  sold?: boolean;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  amount?: number | string;
  soldAt?: string;
  [key: string]: unknown;
}

export interface Project {
  id: number | string;
  projectName: string;
  name?: string;
  city: string;
  area?: string;
  state?: string;
  address?: string;
  zipCode?: string;
  pincode?: string;
  pinCode?: string;
  postalCode?: string;
  totalUnits?: number;
  soldUnits?: number;
  price?: number;
  status?: string;
  googleMapsUrl?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  propertyType?: string;
  listingType?: string;
  configs?: ProjectConfig[];
  completionPercentage?: number;
  parkingAvailable?: boolean;
  unitInventory?: ProjectUnit[];
  coverPhotoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ProjectConfig {
  id?: number | string;
  configLabel?: string;
  bhk?: string | number;
  flatType?: string;
  propertyType?: string;
  listingType?: string;
  price?: number | string;
  units?: number | string;
  unitsSold?: number | string;
  ratePerSqft?: number | string;
  carpetAreaSqft?: number | string;
  saleableAreaSqft?: number | string;
  parkingAvailable?: boolean;
  unitInventory?: ProjectUnit[];
  [key: string]: unknown;
}

export interface ProjectDocument {
  id: number | string;
  projectId: number | string;
  fileName: string;
  fileUrl?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface Lead {
  id: number | string;
  customer?: string;
  customerName: string;
  phone: string;
  email?: string;
  city?: string;
  status: string;
  assignedEmployeeId?: number | string;
  assignedEmployeeName?: string;
  propertyInterest?: string;
  projectId?: number | string;
  configId?: number | string;
  projectName?: string;
  projectInterest?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface FollowUp {
  id: number | string;
  leadId: number | string;
  leadName?: string;
  customerName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledAt?: string;
  type?: string;
  callingType?: string;
  status?: string;
  notes?: string;
  description?: string;
  completed?: boolean;
  isCompleted?: boolean;
  ownerName?: string;
  ownerUserId?: number | string;
  [key: string]: unknown;
}

export interface FollowUpDashboard {
  totalCount?: number;
  overdueCount?: number;
  completedCount?: number;
  pendingTodayCount?: number;
  items?: FollowUp[];
}

export interface Sale {
  id: number | string;
  projectId: number | string;
  projectName?: string;
  configurationId?: number | string;
  configLabel?: string;
  propertyType?: string;
  listingType?: string;
  unitId?: number | string;
  unitLabel?: string;
  unitsSold?: number | string;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  amount: number | string;
  notes?: string;
  soldBy?: string;
  soldByName?: string;
  soldByRole?: string;
  saleDate?: string;
  [key: string]: unknown;
}

export type SaleRecord = Sale;

export interface Location {
  id: number | string;
  locationName?: string;
  state: string;
  city: string;
  area?: string;
  rate?: number;
  subscriptionRate?: number;
  areaCount?: number;
  [key: string]: unknown;
}

export interface Area {
  id: number | string;
  locationId: number | string;
  name: string;
  [key: string]: unknown;
}

export interface SubscriptionDetails {
  userId?: number | string;
  active?: boolean;
  subscriptionType?: 'location_based' | 'full' | string;
  subscriptionExpiresAt?: string;
  assignedCity?: string;
  assignedArea?: string;
  completionPercentage?: number;
  paymentStatus?: string;
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  conversationId?: string;
  type?: string;
  name?: string;
  participants?: Array<{
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
    profilePhotoUrl?: string;
    isOnline?: boolean;
    [key: string]: unknown;
  }>;
  participantIds?: string[];
  participantNames?: string[];
  lastMessage?: string | Record<string, unknown>;
  lastMessageAt?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  messageId?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  type?: string;
  content?: string;
  text?: string;
  sentAt?: string;
  timestamp?: string;
  editedAt?: string | null;
  status?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  reactions?: Array<{ userId?: string; emoji?: string; [key: string]: unknown }>;
  readBy?: string[];
  isDeleted?: boolean;
  replyToId?: string | null;
  replyTo?: Record<string, unknown>;
  attachments?: Array<{ fileName: string; fileUrl: string }>;
  [key: string]: unknown;
}

export interface ActivityItem {
  id: string;
  text: string;
  timestamp: string;
  type?: string;
}

export interface DashboardStats {
  totalLeads?: number;
  newLeads?: number;
  totalSales?: number;
  totalRevenue?: number;
  activeProjects?: number;
  pendingFollowUps?: number;
  [key: string]: unknown;
}

export interface UserRecord {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  city?: string;
  kycStatus?: string;
  active?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}
