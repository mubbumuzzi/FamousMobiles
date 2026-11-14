import { RepairStatus } from "@/lib/types";

export const CUSTOMER_STATUS_MESSAGES: Record<RepairStatus, string> = {
  DEVICE_RECEIVED: "We've received your device safely at our shop.",
  UNDER_DIAGNOSIS: "Your device is being diagnosed by our technician.",
  WAITING_FOR_APPROVAL: "We're waiting for your approval on the repair estimate.",
  WAITING_FOR_PARTS: "We're waiting for spare parts to arrive.",
  REPAIR_IN_PROGRESS: "Repair is currently in progress.",
  QUALITY_CHECK: "Your device is going through quality check.",
  READY_FOR_PICKUP: "Great news! Your device is ready for pickup.",
  NOT_REPAIRABLE_READY_FOR_PICKUP: "Diagnosis completed. Unfortunately, your device cannot be repaired. It has been reassembled and is ready for collection at our shop.",
  DELIVERED: "Your device has been delivered. Thank you for choosing us!",
  RETURNED_UNREPAIRED: "This repair was cancelled and the device has been returned unrepaired. Any advance paid was refunded.",
};

export function getCustomerStatusMessage(status: RepairStatus): string {
  return CUSTOMER_STATUS_MESSAGES[status];
}

export function getProgressPercent(status: RepairStatus): number {
  if (status === "RETURNED_UNREPAIRED" || status === "NOT_REPAIRABLE_READY_FOR_PICKUP") return 100;
  const order: RepairStatus[] = [
    "DEVICE_RECEIVED",
    "UNDER_DIAGNOSIS",
    "WAITING_FOR_APPROVAL",
    "REPAIR_IN_PROGRESS",
    "READY_FOR_PICKUP",
    "DELIVERED",
  ];
  const idx = order.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

export function isOverdue(estimatedDeliveryDate?: string, status?: RepairStatus): boolean {
  if (
    !estimatedDeliveryDate ||
    status === "DELIVERED" ||
    status === "RETURNED_UNREPAIRED" ||
    status === "READY_FOR_PICKUP" ||
    status === "NOT_REPAIRABLE_READY_FOR_PICKUP"
  )
    return false;
  const edd = new Date(estimatedDeliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return edd < today;
}
