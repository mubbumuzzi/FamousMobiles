"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  Plus,
  Search,
  ShoppingBag,
  Users,
  Wrench,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Phone,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardMetrics, MetricDrilldownType, Ticket } from "@/lib/types";
import { formatCurrency, formatStatus, formatDate, isSameDay, cn } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { buildWhatsAppDelayUrl, buildWhatsAppPickupUrl } from "@/lib/whatsapp";
import { MetricDrilldownDrawer } from "@/components/dashboard/MetricDrilldownDrawer";
import { StockDemandSnapshot } from "@/components/dashboard/StockDemandSnapshot";
import { StockOrderModal } from "@/components/stock/StockOrderModal";
import { useStore } from "@/context/StoreContext";

const StatusPieChart = dynamic(
  () => import("@/components/dashboard/StatusPieChart").then((m) => m.StatusPieChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case "DEVICE_RECEIVED":
      return "bg-[#F7F7F8] text-[#555555] border-[#EBEBEB]";
    case "IN_PROGRESS":
    case "REPAIR_IN_PROGRESS":
    case "UNDER_DIAGNOSIS":
      return "bg-[#EFF6FF] text-[#1D4ED8] border-blue-200";
    case "WAITING_FOR_PARTS":
      return "bg-[#FFFBEB] text-[#B45309] border-amber-200";
    case "WAITING_FOR_APPROVAL":
      return "bg-[#FAF5FF] text-[#7E22CE] border-purple-200";
    case "QUALITY_CHECK":
      return "bg-[#FDF4FF] text-[#A21CAF] border-fuchsia-200";
    case "READY_FOR_PICKUP":
      return "bg-[#EAF6EE] text-[#0E8345] border-green-200";
    case "DELIVERED":
      return "bg-[#F0FDF4] text-[#15803D] border-green-300";
    case "RETURNED_UNREPAIRED":
      return "bg-[#FEF2F2] text-[#B91C1C] border-red-200";
    default:
      return "bg-[#F7F7F8] text-[#121212] border-[#EBEBEB]";
  }
}

function formatCompactStatus(status: string): string {
  switch (status) {
    case "DEVICE_RECEIVED":
      return "Received";
    case "IN_PROGRESS":
    case "REPAIR_IN_PROGRESS":
      return "In Progress";
    case "UNDER_DIAGNOSIS":
      return "Diagnosing";
    case "READY_FOR_PICKUP":
      return "Ready";
    case "DELIVERED":
      return "Delivered";
    case "WAITING_FOR_PARTS":
      return "Waiting Parts";
    case "WAITING_FOR_APPROVAL":
      return "Waiting Approval";
    case "RETURNED_UNREPAIRED":
      return "Unrepaired";
    case "REOPENED_FOR_RECHECK":
      return "Re-Check";
    default:
      return formatStatus(status);
  }
}

type AdminDashboardProps = {
  metrics: DashboardMetrics | null;
  tickets: Ticket[];
  loading: boolean;
  error: string;
  onRefresh?: () => void;
};

export function AdminDashboard({ metrics, tickets, loading, error, onRefresh }: AdminDashboardProps) {
  const router = useRouter();
  const { activeStore, activeStoreId } = useStore();
  const [activeMetric, setActiveMetric] = useState<MetricDrilldownType | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "OVERDUE">("ALL");
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockRefreshTrigger, setStockRefreshTrigger] = useState(0);

  const statusData = metrics
    ? Object.entries(metrics.statusBreakdown).map(([name, value]) => ({ name: formatStatus(name), value }))
    : [];

  const brandBreakdown = tickets.reduce<Record<string, number>>((acc, t) => {
    const brand = t.brand || "Unknown";
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {});
  const topBrands = Object.entries(brandBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const delivered = tickets.filter((t) => t.status === "DELIVERED").length;
  const deliveredTodayCount = tickets.filter((t) => t.status === "DELIVERED" && isSameDay(t.deliveredAt)).length;
  const receivedTodayCount = tickets.filter((t) => isSameDay(t.createdAt)).length;
  const activeRepairs = tickets.filter(
    (t) =>
      t.status !== "DELIVERED" &&
      t.status !== "RETURNED_UNREPAIRED" &&
      t.status !== "READY_FOR_PICKUP"
  );
  const activeCount = activeRepairs.length;
  const overdueCount = tickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status)).length;

  const displayedActiveRepairs = activeRepairs.filter((t) => {
    if (activeFilter === "OVERDUE") {
      return isOverdue(t.estimatedDeliveryDate, t.status);
    }
    return true;
  });

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const storeDisplay = activeStoreId === "ALL" ? "All Stores" : (activeStore?.displayName || activeStore?.name || "Main Store");

  // Define the 8 KPI cells for the single white card
  const kpiCells = [
    {
      key: "revenueToday" as MetricDrilldownType,
      label: "Revenue Today",
      value: loading ? null : formatCurrency(Number(metrics?.revenueToday ?? 0)),
      helper: loading
        ? "Day-end total"
        : (metrics?.repairRevenueToday !== undefined && metrics?.salesRevenueToday !== undefined && (metrics.repairRevenueToday > 0 || metrics.salesRevenueToday > 0))
          ? `Repairs: ${formatCurrency(metrics.repairRevenueToday)} · Sales: ${formatCurrency(metrics.salesRevenueToday)}`
          : "Day-end total",
      dot: null,
      isOverdue: false,
    },
    {
      key: "revenueMonth" as MetricDrilldownType,
      label: "Revenue (Month)",
      value: loading ? null : formatCurrency(Number(metrics?.revenueThisMonth ?? 0)),
      helper: loading
        ? "Monthly billing"
        : (metrics?.repairRevenueThisMonth !== undefined && metrics?.salesRevenueThisMonth !== undefined && (metrics.repairRevenueThisMonth > 0 || metrics.salesRevenueThisMonth > 0))
          ? `Repairs: ${formatCurrency(metrics.repairRevenueThisMonth)} · Sales: ${formatCurrency(metrics.salesRevenueThisMonth)}`
          : "Monthly billing",
      dot: null,
      isOverdue: false,
    },
    {
      key: "activeRepairs" as MetricDrilldownType,
      label: "Active Repairs",
      value: loading ? null : activeCount,
      helper: overdueCount > 0 ? `${overdueCount} overdue` : "In workshop",
      dot: null,
      isOverdue: overdueCount > 0,
      overdueCount,
    },
    {
      key: "readyPickup" as MetricDrilldownType,
      label: "Ready Pickup",
      value: loading ? null : (metrics?.readyForPickup ?? 0),
      helper: "Verified & waiting",
      dot: "bg-[#0E8345]", // green dot for ready status
      actionPrompt: (metrics?.readyForPickup ?? 0) > 0 ? "Send alerts" : null,
      isOverdue: false,
    },
    {
      key: "receivedToday" as MetricDrilldownType,
      label: "Received Today",
      value: loading ? null : (tickets.length > 0 ? receivedTodayCount : metrics?.devicesReceivedToday ?? 0),
      helper: "New intakes",
      dot: null,
      isOverdue: false,
    },
    {
      key: "deliveredToday" as MetricDrilldownType,
      label: "Delivered Today",
      value: loading ? null : (tickets.length > 0 ? deliveredTodayCount : metrics?.deliveredToday ?? 0),
      helper: "Returned today",
      dot: null,
      isOverdue: false,
    },
    {
      key: "waitingParts" as MetricDrilldownType,
      label: "Waiting Parts",
      value: loading ? null : (metrics?.waitingForParts ?? 0),
      helper: "Awaiting spare parts",
      dot: "bg-[#B35300]", // amber dot for waiting status
      isOverdue: false,
    },
    {
      key: "deliveredAll" as MetricDrilldownType,
      label: "Total Delivered",
      value: loading ? null : delivered,
      helper: "All-time completed",
      dot: null,
      isOverdue: false,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in text-[#121212]">
      {/* 3. Page Header: Overview (20px bold) + small muted line with date & active store + Primary New Repair button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">
            Overview
          </h1>
          <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
            {todayFormatted} · {storeDisplay}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("fm:open-sell-accessory"))}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[10px] border border-[#EBEBEB] bg-white text-[13px] font-semibold text-[#121212] hover:bg-[#F7F7F8] active:scale-95 transition-all shadow-2xs cursor-pointer"
            title="Direct counter sale with warranty bill"
          >
            <ShieldCheck className="h-4 w-4 text-[#0E8345]" />
            <span>Sell Accessory</span>
          </button>

          <Link href="/tickets/new">
            <Button variant="primary" className="h-10 px-4 text-[13px] font-semibold gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>New Repair</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* 2. Fast Search Bar (opens /search), 44px min height */}
      <Link
        href="/search"
        className="flex min-h-[44px] h-11 items-center gap-2.5 rounded-[10px] border border-[#EBEBEB] bg-white px-3.5 text-[14px] leading-[20px] text-[#767676] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#FDFDFD] transition-colors"
      >
        <Search className="h-4 w-4 text-[#767676] shrink-0" />
        <span className="truncate">Search by customer name, mobile, brand, or tracking ID...</span>
      </Link>

      {/* 4. KPI Section: ONE white card, 1px border, 12px radius, 4-col grid with 1px dividers, 2 rows (2-col on mobile) */}
      <section aria-label="Key Performance Indicators">
        <div className="rounded-[12px] border border-[#EBEBEB] bg-[#EBEBEB] gap-[1px] grid grid-cols-2 lg:grid-cols-4 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {kpiCells.map((cell) => {
            const isSelected = activeMetric === cell.key;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setActiveMetric(cell.key)}
                className={cn(
                  "relative flex flex-col justify-between p-3.5 sm:p-4 text-left transition-colors h-[96px] bg-white group cursor-pointer select-none",
                  isSelected ? "bg-[#F7F7F8] ring-1 ring-inset ring-[#121212]" : "hover:bg-[#FCFCFD]"
                )}
              >
                {/* Top Row: Label with single line truncate & status dot, plus hover chevron */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[12px] leading-[16px] font-medium text-[#767676] truncate flex items-center gap-1.5">
                    {cell.dot && (
                      <span className={cn("h-2 w-2 rounded-full shrink-0", cell.dot)} aria-hidden="true" />
                    )}
                    <span className="truncate">{cell.label}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>

                {/* Big Number */}
                <div>
                  {cell.value === null ? (
                    <Skeleton className="h-7 w-20 my-0.5" />
                  ) : (
                    <p className="text-[28px] leading-[32px] font-bold text-[#121212] tracking-tight">
                      {cell.value}
                    </p>
                  )}
                </div>

                {/* Helper Text / Urgent Overdue Badge / Action Prompt */}
                {cell.isOverdue && cell.overdueCount && cell.overdueCount > 0 ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[#C5221F] bg-[#FEF2F2] border border-[#FECACA] px-1.5 py-0.5 rounded-[4px] text-[10.5px] leading-tight self-start">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{cell.overdueCount} overdue</span>
                  </span>
                ) : cell.actionPrompt ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] leading-[14px] text-[#767676] truncate">
                      {cell.helper}
                    </span>
                    <span className="text-[10px] font-semibold text-[#0E8345] bg-[#EAF6EE] px-1.5 py-0.2 rounded border border-green-200">
                      {cell.actionPrompt}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] leading-[14px] text-[#767676] truncate">
                    {cell.helper}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Quick Actions: 4 distinct operational shortcuts (replaces duplicate New Repair and duplicate Search) */}
      <section aria-label="Quick Actions">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: New Repair (Filled near-black card = primary action) */}
          <Link
            href="/tickets/new"
            className="flex flex-col justify-between rounded-[12px] border border-[#121212] bg-[#121212] p-4 text-white shadow-xs transition-all hover:bg-black active:scale-[0.98] min-h-[104px] sm:min-h-[112px] group cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/15 text-white mb-2">
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[14px] leading-[20px] font-bold text-white">New Repair</p>
              <p className="text-[12px] leading-[16px] text-white/70 mt-0.5">Start device intake</p>
            </div>
          </Link>

          {/* Card 2: Order Stock (Quick modal to record spare parts / accessories demand) */}
          <button
            type="button"
            onClick={() => setIsStockModalOpen(true)}
            className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#DFDFDF] hover:bg-[#FDFDFD] active:scale-[0.98] min-h-[104px] sm:min-h-[112px] group cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] mb-2 group-hover:bg-white border border-[#EBEBEB] transition-colors">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] leading-[20px] font-bold text-[#121212]">Order Stock</p>
              <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">Parts & accessories</p>
            </div>
          </button>

          {/* Card 3: Sell Accessory (Direct counter sale & warranty invoice) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("fm:open-sell-accessory"))}
            className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#DFDFDF] hover:bg-[#FDFDFD] active:scale-[0.98] min-h-[104px] sm:min-h-[112px] group cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EAF6EE] text-[#0E8345] mb-2 group-hover:bg-[#d8eedf] border border-green-200 transition-colors">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] leading-[20px] font-bold text-[#121212]">Sell Accessory</p>
              <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">Counter sale & bill</p>
            </div>
          </button>

          {/* Card 4: Cash Drawer & Day-End Audit */}
          <button
            type="button"
            onClick={() => setActiveMetric("revenueToday")}
            className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#DFDFDF] hover:bg-[#FDFDFD] active:scale-[0.98] min-h-[104px] sm:min-h-[112px] group cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] mb-2 group-hover:bg-white border border-[#EBEBEB] transition-colors">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] leading-[20px] font-bold text-[#121212]">Cash Drawer</p>
              <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">Day-end cash & UPI</p>
            </div>
          </button>
        </div>
      </section>

      {/* Active Repairs Section: Filter tabs (All / Overdue) + Color coded cards with explicit financial labels and 1-tap WhatsApp/Call */}
      <section aria-label="Recent Active Repairs" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] leading-[20px] font-bold text-[#121212]">
              Active Repairs
            </h2>

            <div className="flex items-center gap-1 bg-[#F0F0F2] p-0.5 rounded-[8px]">
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 text-[12px] font-semibold rounded-[6px] transition-all cursor-pointer",
                  activeFilter === "ALL"
                    ? "bg-white text-[#121212] shadow-2xs"
                    : "text-[#767676] hover:text-[#121212]"
                )}
              >
                All ({activeCount})
              </button>

              {overdueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("OVERDUE")}
                  className={cn(
                    "px-2.5 py-1 text-[12px] font-semibold rounded-[6px] transition-all flex items-center gap-1 cursor-pointer",
                    activeFilter === "OVERDUE"
                      ? "bg-[#FEF2F2] text-[#C5221F] shadow-2xs font-bold border border-[#FECACA]"
                      : "text-[#C5221F] hover:bg-[#FEF2F2]/60"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Overdue ({overdueCount})</span>
                </button>
              )}
            </div>
          </div>

          <Link
            href="/tickets"
            className="text-[13px] font-semibold text-[#121212] hover:underline"
          >
            See all
          </Link>
        </div>

        {displayedActiveRepairs.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#EBEBEB] bg-white p-8 text-center text-[13px] text-[#767676]">
            {activeFilter === "OVERDUE"
              ? "Great job! Zero repairs are currently overdue."
              : 'No active repairs in workshop. Click "New Repair" to intake a device.'}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
            {displayedActiveRepairs.slice(0, 6).map((ticket) => {
              const ticketIsOverdue = isOverdue(ticket.estimatedDeliveryDate, ticket.status);
              const isDueToday = ticket.estimatedDeliveryDate && isSameDay(ticket.estimatedDeliveryDate);
              const est = Number(ticket.estimatedCost || 0);
              const bal = Number(ticket.balanceAmount || 0);
              const adv = Number(ticket.advancePaid || 0);
              const badgeStyle = getStatusBadgeStyle(ticket.status);

              return (
                <div
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/view?id=${ticket.id}`)}
                  className="w-[280px] sm:w-auto shrink-0 snap-start flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 sm:p-4 hover:border-[#121212]/30 hover:shadow-2xs transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[12px] font-bold text-[#121212]">
                        {ticket.trackingNumber}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[11px] font-bold leading-none shrink-0",
                          badgeStyle
                        )}
                      >
                        {formatCompactStatus(ticket.status)}
                      </span>
                    </div>

                    <p className="text-[14px] leading-[20px] font-bold text-[#121212] truncate">
                      {ticket.brand} {ticket.model}
                    </p>

                    <p className="text-[12px] leading-[16px] text-[#767676] truncate mt-0.5">
                      {ticket.customer?.fullName} · {ticket.customer?.mobile}
                    </p>

                    {/* Overdue / Due Today Alert Badge */}
                    {ticketIsOverdue ? (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C5221F] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-[5px] mt-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>Overdue · Due {formatDate(ticket.estimatedDeliveryDate)}</span>
                      </div>
                    ) : isDueToday ? (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B35300] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-[5px] mt-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Due Today</span>
                      </div>
                    ) : ticket.estimatedDeliveryDate ? (
                      <div className="inline-flex items-center gap-1 text-[11px] text-[#767676] mt-1.5 font-medium">
                        <Clock className="h-3 w-3 text-[#767676]" />
                        <span>Due {formatDate(ticket.estimatedDeliveryDate)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer: Financial Breakdown & 1-Tap Action Shortcuts */}
                  <div className="flex items-center justify-between border-t border-[#EBEBEB] pt-2.5 mt-3 text-[12px]">
                    <div>
                      {est <= 0 ? (
                        <span className="text-[11px] font-medium text-[#767676] bg-[#F7F7F8] px-2 py-0.5 rounded border border-[#EBEBEB]">
                          Quote Pending
                        </span>
                      ) : bal > 0 ? (
                        <div className="flex flex-col text-left">
                          <span className="text-[13px] font-bold text-[#121212]">
                            Bal: {formatCurrency(bal)}
                          </span>
                          {adv > 0 && (
                            <span className="text-[10px] text-[#767676] font-medium">
                              Est: {formatCurrency(est)} · Adv: {formatCurrency(adv)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E8345] bg-[#EAF6EE] px-2 py-0.5 rounded border border-green-200">
                          Paid in Full ✓
                        </span>
                      )}
                    </div>

                    {/* 1-Tap Call & WhatsApp Shortcuts */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {ticket.customer?.mobile && (
                        <>
                          <a
                            href={`tel:${ticket.customer.mobile}`}
                            className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                            title={`Call ${ticket.customer.fullName} (${ticket.customer.mobile})`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>

                          <a
                            href={
                              ticket.status === "READY_FOR_PICKUP"
                                ? buildWhatsAppPickupUrl(ticket)
                                : buildWhatsAppDelayUrl(ticket)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#EAF6EE] text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 transition-all"
                            title="Send WhatsApp update"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Stock & Accessory Demands Snapshot */}
      <StockDemandSnapshot
        onOpenNewStockOrder={() => setIsStockModalOpen(true)}
        refreshTrigger={stockRefreshTrigger}
        waitingPartsCount={metrics?.waitingForParts ?? 0}
      />

      {/* Charts & Analytics Breakdown: clean white cards, 12px radius, 15px titles */}
      <section aria-label="Breakdowns" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[#121212]">
            <BarChart3 className="h-4 w-4 text-[#121212]" /> Status Breakdown
          </h2>
          <div className="h-64">
            <StatusPieChart data={statusData} />
          </div>
        </div>

        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[#121212]">
            <Users className="h-4 w-4 text-[#121212]" /> Top Device Brands
          </h2>
          <div className="space-y-3">
            {topBrands.length === 0 && <p className="text-[13px] text-[#767676]">No device data yet</p>}
            {topBrands.map(([brand, count]) => (
              <div key={brand}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-semibold text-[#121212]">{brand}</span>
                  <span className="text-[#767676]">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EBEBEB]">
                  <div
                    className="h-full rounded-full bg-[#121212]"
                    style={{ width: `${Math.min(100, (count / (tickets.length || 1)) * 100 * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Drilldown Drawer & Modals */}
      <MetricDrilldownDrawer
        metric={activeMetric}
        onClose={() => setActiveMetric(null)}
        onSelectMetric={setActiveMetric}
        tickets={tickets}
        role="ADMIN"
        onTicketUpdated={onRefresh || (() => {})}
        devicesReceivedToday={tickets.length > 0 ? receivedTodayCount : metrics?.devicesReceivedToday ?? 0}
        devicesDeliveredToday={tickets.length > 0 ? deliveredTodayCount : metrics?.deliveredToday ?? 0}
      />

      <StockOrderModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={() => setStockRefreshTrigger((t) => t + 1)}
      />
    </div>
  );
}
