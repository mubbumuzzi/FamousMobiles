export type UserRole = "ADMIN" | "SALESMAN" | "TECHNICIAN";

export type RepairStatus =
  | "DEVICE_RECEIVED"
  | "UNDER_DIAGNOSIS"
  | "WAITING_FOR_APPROVAL"
  | "WAITING_FOR_PARTS"
  | "REPAIR_IN_PROGRESS"
  | "QUALITY_CHECK"
  | "READY_FOR_PICKUP"
  | "DELIVERED"
  | "RETURNED_UNREPAIRED";

export type DeviceType = "MOBILE" | "TABLET" | "SMART_WATCH" | "LAPTOP" | "OTHER";
export type PaymentMode = "CASH" | "UPI" | "CARD";
export type PhotoType = "FRONT" | "BACK" | "DAMAGE" | "REPAIR";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  mobile: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface StaffUser {
  id: string;
  mobile: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface CustomerMobile {
  number: string;
  label?: string;
  isPrimary?: boolean;
}

export interface Customer {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  alternateMobile?: string;
  mobiles?: CustomerMobile[];
  matchedMobile?: string;
  address?: string;
  area?: string;
  city?: string;
  notes?: string;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  trackingNumber: string;
  customer: Customer;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status: RepairStatus;
  deviceType: DeviceType;
  brand?: string;
  model?: string;
  color?: string;
  imei?: string;
  accessoriesReceived: string[];
  deviceCondition: string[];
  problemDescription?: string;
  estimatedCost: number;
  advancePaid: number;
  balanceAmount: number;
  estimatedDeliveryDate?: string;
  createdAt: string;
  deliveredAt?: string;
  warrantyDays?: number;
}

export interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  authorName?: string;
  createdAt: string;
}

export interface PublicTracking {
  trackingNumber: string;
  brand?: string;
  model?: string;
  color?: string;
  imeiMasked?: string;
  currentStatus: RepairStatus;
  estimatedDeliveryDate?: string;
  estimatedCost: number;
  advancePaid: number;
  balanceAmount: number;
  timeline: TimelineEntry[];
  allStatuses: RepairStatus[];
  warrantyDays?: number;
}

export interface DashboardMetrics {
  devicesReceivedToday: number;
  devicesUnderRepair: number;
  waitingForParts: number;
  readyForPickup: number;
  deliveredToday: number;
  revenueToday?: number;
  revenueThisWeek?: number;
  revenueThisMonth?: number;
  statusBreakdown: Record<string, number>;
}

export interface Technician {
  id: string;
  name: string;
  mobile: string;
  skillLevel: string;
  active: boolean;
  assignedJobs?: number;
  completedJobs?: number;
  averageRepairTimeHours?: number;
}

export interface Payment {
  id: string;
  ticketId: string;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
  recordedByName?: string;
  createdAt: string;
}

export interface DetailedPayment {
  id: string;
  ticketId: string;
  trackingNumber: string;
  customerName: string;
  customerMobile: string;
  brand: string;
  model: string;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
  recordedByName: string;
  createdAt: string;
  balanceAmount: number;
}

export interface TodayRevenueSummary {
  totalRevenue: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  transactionCount: number;
  payments: DetailedPayment[];
}

export type MetricDrilldownType =
  | "revenueToday"
  | "revenueMonth"
  | "activeRepairs"
  | "deliveredAll"
  | "receivedToday"
  | "readyPickup"
  | "waitingParts"
  | "deliveredToday"
  | "overdue";

export const REPAIR_STATUSES: RepairStatus[] = [
  "DEVICE_RECEIVED",
  "UNDER_DIAGNOSIS",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTS",
  "REPAIR_IN_PROGRESS",
  "QUALITY_CHECK",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "RETURNED_UNREPAIRED",
];

export const ACCESSORIES = ["Battery", "SIM Card", "Memory Card", "Charger", "Earphones", "Box", "Stylus", "Other"];
export const CONDITIONS = ["Screen Cracked", "Back Glass Broken", "Water Damage", "Camera Damage", "Touch Not Working", "Bent Frame"];
