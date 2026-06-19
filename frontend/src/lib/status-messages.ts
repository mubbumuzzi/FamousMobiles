import { RepairStatus } from "@/lib/types";

export const CUSTOMER_STATUS_MESSAGES: Record<RepairStatus, string> = {
  DEVICE_RECEIVED: "We've received your device safely at our shop.",
  UNDER_DIAGNOSIS: "Your device is being diagnosed by our technician.",
  WAITING_FOR_APPROVAL: "We're waiting for your approval on the repair estimate.",
  WAITING_FOR_PARTS: "We're waiting for spare parts to arrive.",
  REPAIR_IN_PROGRESS: "Repair is currently in progress.",
  QUALITY_CHECK: "Your device is going through quality check.",
  READY_FOR_PICKUP: "Great news! Your device is ready for pickup.",
  DELIVERED: "Your device has been delivered. Thank you for choosing us!",
};

export function getCustomerStatusMessage(status: RepairStatus): string {
  return CUSTOMER_STATUS_MESSAGES[status];
}

export function getProgressPercent(status: RepairStatus): number {
  const order: RepairStatus[] = [
    "DEVICE_RECEIVED",
    "UNDER_DIAGNOSIS",
    "WAITING_FOR_APPROVAL",
    "WAITING_FOR_PARTS",
    "REPAIR_IN_PROGRESS",
    "QUALITY_CHECK",
    "READY_FOR_PICKUP",
    "DELIVERED",
  ];
  const idx = order.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

export function isOverdue(estimatedDeliveryDate?: string, status?: RepairStatus): boolean {
  if (!estimatedDeliveryDate || status === "DELIVERED") return false;
  const edd = new Date(estimatedDeliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return edd < today;
}
