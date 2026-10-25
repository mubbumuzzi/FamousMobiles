import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRole(role: string) {
  if (role === "SALESMAN") return "Salesman";
  if (role === "TECHNICIAN") return "Technician";
  if (role === "ADMIN") return "Admin";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatCustomerMobiles(customer: {
  mobile: string;
  mobiles?: { number: string; label?: string; isPrimary?: boolean }[];
}) {
  if (customer.mobiles && customer.mobiles.length > 0) {
    return customer.mobiles
      .map((m) => (m.label ? `${m.number} (${m.label})` : m.number))
      .join(" · ");
  }
  return customer.mobile;
}

export function customerPhoneList(customer: {
  mobile: string;
  mobiles?: { number: string; label?: string; isPrimary?: boolean }[];
}) {
  if (customer.mobiles && customer.mobiles.length > 0) {
    return customer.mobiles.map((m) => m.number);
  }
  return customer.mobile ? [customer.mobile] : [];
}

export function isSameDay(isoString?: string | null, targetDate = new Date()): boolean {
  if (!isoString) return false;
  const d = new Date(isoString);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

export function getWarrantyStatus(ticket: { warrantyDays?: number; deliveredAt?: string }) {
  const days = ticket.warrantyDays ?? 0;
  if (!days || days <= 0) {
    return { status: "NONE" as const, label: "No Warranty", daysRemaining: 0, tone: "secondary" as const };
  }

  if (!ticket.deliveredAt) {
    return {
      status: "PENDING" as const,
      label: `${days} Days Warranty (Starts upon delivery)`,
      daysRemaining: days,
      tone: "primary" as const,
    };
  }

  const deliveredDate = new Date(ticket.deliveredAt);
  const expiryDate = new Date(deliveredDate);
  expiryDate.setDate(expiryDate.getDate() + days);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      status: "EXPIRED" as const,
      label: `Warranty Expired (${formatDate(expiryDate.toISOString())})`,
      daysRemaining: 0,
      tone: "destructive" as const,
    };
  }

  return {
    status: "ACTIVE" as const,
    label: `🛡️ ${diffDays}d left · Valid till ${formatDate(expiryDate.toISOString())}`,
    daysRemaining: diffDays,
    tone: "success" as const,
  };
}

export function getVipStatus(repairCount = 0) {
  if (repairCount >= 5) {
    return {
      isVip: true,
      isRepeat: true,
      label: `👑 VIP Customer (${repairCount} repairs)`,
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-xs",
    };
  }
  if (repairCount >= 2) {
    return {
      isVip: false,
      isRepeat: true,
      label: `⭐ Repeat Customer (${repairCount} repairs)`,
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200 font-medium",
    };
  }
  return {
    isVip: false,
    isRepeat: false,
    label: "",
    badgeClass: "",
  };
}
