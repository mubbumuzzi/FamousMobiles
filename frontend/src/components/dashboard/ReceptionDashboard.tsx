"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Package,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  Wrench,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMetrics, MetricDrilldownType, Ticket } from "@/lib/types";
import { formatCurrency, formatStatus, isSameDay } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { MetricDrilldownDrawer } from "@/components/dashboard/MetricDrilldownDrawer";
import { StockDemandBoard } from "@/components/stock/StockDemandBoard";
import { StockOrderModal } from "@/components/stock/StockOrderModal";
import { useStore } from "@/context/StoreContext";
import { cn } from "@/lib/utils";

type ReceptionDashboardProps = {
  metrics: DashboardMetrics | null;
  tickets: Ticket[];
  loading: boolean;
  error: string;
  showRevenue?: boolean;
  onRefresh?: () => void;
};

export function ReceptionDashboard({
  metrics,
  tickets,
  loading,
  error,
  showRevenue = false,
  onRefresh,
}: ReceptionDashboardProps) {
  const router = useRouter();
  const { activeStore, activeStoreId } = useStore();
  const [activeMetric, setActiveMetric] = useState<MetricDrilldownType | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockRefreshTrigger, setStockRefreshTrigger] = useState(0);

  const overdue = tickets.filter(
    (t) =>
      isOverdue(t.estimatedDeliveryDate, t.status) &&
      t.status !== "DELIVERED" &&
      t.status !== "RETURNED_UNREPAIRED" &&
      t.status !== "READY_FOR_PICKUP" &&
      t.status !== "NOT_REPAIRABLE_READY_FOR_PICKUP"
  );
  const ready = tickets.filter(
    (t) => t.status === "READY_FOR_PICKUP"
  );
  const notRepairableCount = tickets.filter(
    (t) => t.status === "NOT_REPAIRABLE_READY_FOR_PICKUP"
  ).length;
  const activeRepairs = tickets.filter(
    (t) =>
      t.status !== "DELIVERED" &&
      t.status !== "RETURNED_UNREPAIRED" &&
      t.status !== "READY_FOR_PICKUP" &&
      t.status !== "NOT_REPAIRABLE_READY_FOR_PICKUP"
  );
  const deliveredCount = tickets.filter((t) => t.status === "DELIVERED").length;
  const receivedTodayCount = tickets.filter((t) => isSameDay(t.createdAt)).length;
  const deliveredTodayCount = tickets.filter(
    (t) => t.status === "DELIVERED" && isSameDay(t.deliveredAt)
  ).length;

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const storeDisplay =
    activeStoreId === "ALL"
      ? "All Stores"
      : activeStore?.displayName || activeStore?.name || "Main Store";

  const kpiCells = [
    {
      key: "activeRepairs" as MetricDrilldownType,
      label: "Active Repairs",
      value: loading ? null : activeRepairs.length,
      helper: overdue.length > 0 ? `${overdue.length} overdue` : "In workshop",
      dot: null,
    },
    {
      key: "readyPickup" as MetricDrilldownType,
      label: "Ready Pickup",
      value: loading ? null : ready.length,
      helper: "Verified & waiting",
      dot: "bg-[#0E8345]",
    },
    {
      key: "receivedToday" as MetricDrilldownType,
      label: "Received Today",
      value: loading ? null : tickets.length > 0 ? receivedTodayCount : metrics?.devicesReceivedToday ?? 0,
      helper: "New intakes",
      dot: null,
    },
    {
      key: "overdue" as MetricDrilldownType,
      label: "Overdue Repairs",
      value: loading ? null : overdue.length,
      helper: overdue.length > 0 ? "Needs attention" : "All on track",
      dot: overdue.length > 0 ? "bg-[#C5221F]" : null,
    },
    ...(showRevenue
      ? [
          {
            key: "revenueToday" as MetricDrilldownType,
            label: "Revenue Today",
            value: loading ? null : formatCurrency(Number(metrics?.revenueToday ?? 0)),
            helper: "Day-end total",
            dot: null,
          },
          {
            key: "deliveredToday" as MetricDrilldownType,
            label: "Delivered Today",
            value: loading ? null : deliveredTodayCount,
            helper: "Returned today",
            dot: null,
          },
          {
            key: "notRepairable" as MetricDrilldownType,
            label: "Not Repairable",
            value: loading ? null : notRepairableCount,
            helper: "Ready for return",
            dot: "bg-[#B35300]",
          },
          {
            key: "deliveredAll" as MetricDrilldownType,
            label: "Total Delivered",
            value: loading ? null : deliveredCount,
            helper: "All-time completed",
            dot: null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in text-[#121212]">
      {/* 1. Page Header */}
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
            <Button variant="primary" className="h-10 px-4 text-[13px] font-semibold gap-1.5 shadow-xs cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>New Repair</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* 2. Fast Search Bar (44px) */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="flex h-11 w-full items-center gap-3 rounded-[10px] border border-[#EBEBEB] bg-white px-3.5 text-left text-[14px] text-[#767676] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] transition-all cursor-pointer"
        >
          <Search className="h-4 w-4 text-[#767676] shrink-0" />
          <span className="truncate">Search by customer name, mobile, brand, or tracking ID...</span>
        </button>
      </div>

      {/* 3. Quick Actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* New Repair - Filled near-black primary card */}
        <Link
          href="/tickets/new"
          className="group flex flex-col justify-between rounded-[12px] bg-[#121212] p-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#222222] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/10 text-white transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-white/50 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-4">
            <p className="text-[15px] font-bold leading-snug">New Repair</p>
            <p className="text-[12px] text-white/70 mt-0.5 leading-snug">Fast device intake</p>
          </div>
        </Link>

        {/* Order Stock */}
        <button
          type="button"
          onClick={() => setIsStockModalOpen(true)}
          className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] transition-transform group-hover:scale-105">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-[#767676] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-4">
            <p className="text-[15px] font-bold text-[#121212] leading-snug">Order Stock</p>
            <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">Cases, parts, chargers</p>
          </div>
        </button>

        {/* Deliver Device */}
        <Link
          href="/tickets?status=READY_FOR_PICKUP"
          className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] transition-transform group-hover:scale-105">
              <Truck className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-[#767676] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-4">
            <p className="text-[15px] font-bold text-[#121212] leading-snug">Deliver Device</p>
            <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">Ready for pickup</p>
          </div>
        </Link>

        {/* Search */}
        <Link
          href="/search"
          className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] transition-transform group-hover:scale-105">
              <Search className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-[#767676] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-4">
            <p className="text-[15px] font-bold text-[#121212] leading-snug">Search</p>
            <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">Find customer / job</p>
          </div>
        </Link>
      </div>

      {/* 4. Unified KPI Section: Single white card with 1px dividers */}
      <div className="overflow-hidden rounded-[12px] border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className={cn(
          "grid grid-cols-2 divide-x divide-y divide-[#EBEBEB]",
          kpiCells.length > 4 ? "lg:grid-cols-4" : "sm:grid-cols-4"
        )}>
          {kpiCells.map((cell) => {
            const isSelected = activeMetric === cell.key;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setActiveMetric(cell.key)}
                className={cn(
                  "group relative flex h-24 flex-col justify-between p-3.5 text-left transition-colors cursor-pointer select-none",
                  isSelected ? "bg-[#F0F0F2]" : "hover:bg-[#F7F7F8]"
                )}
              >
                {/* Top row: Label + Status Dot + Hover Chevron */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {cell.dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cell.dot)} />}
                    <span className="truncate text-[12px] leading-tight font-medium text-[#767676]">
                      {cell.label}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#767676] opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100" />
                </div>

                {/* Number */}
                <div>
                  {cell.value === null ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-[28px] font-bold leading-none tracking-tight text-[#121212]">
                      {cell.value}
                    </p>
                  )}
                </div>

                {/* Helper subtitle */}
                <p className="truncate text-[11px] leading-none text-[#767676]">
                  {cell.helper}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Active Repairs */}
      <section aria-label="Active Repairs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-[#121212]">Active Repairs</h2>
            <span className="rounded-full bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-semibold text-[#767676]">
              {activeRepairs.length}
            </span>
          </div>
          <Link
            href="/tickets"
            className="text-[13px] font-semibold text-[#121212] hover:text-[#2B59FF] transition-colors"
          >
            See all →
          </Link>
        </div>

        {activeRepairs.length === 0 ? (
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-8 text-center text-[#767676]">
            <Package className="mx-auto mb-2 h-7 w-7 text-[#767676]" />
            <p className="text-[14px] font-medium text-[#121212]">No active repairs</p>
            <p className="text-[12px] text-[#767676] mt-0.5">All customer devices have been delivered</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
            {activeRepairs.slice(0, 6).map((ticket) => {
              const overdueItem = isOverdue(ticket.estimatedDeliveryDate, ticket.status);

              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/view?id=${ticket.id}`}
                  className="flex min-w-[260px] max-w-[280px] shrink-0 snap-start flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] sm:min-w-0 sm:max-w-none transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[#121212]">
                        {ticket.brand} {ticket.model}
                      </p>
                      <p className="truncate text-[12px] text-[#767676] mt-0.5">
                        {ticket.customer?.fullName || "Walk-in Customer"}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        overdueItem
                          ? "bg-[#FDE8E8] text-[#C5221F]"
                          : "bg-[#F0F0F2] text-[#121212]"
                      )}
                    >
                      {formatStatus(ticket.status)}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#767676]">
                    <span className="font-mono">{ticket.trackingNumber}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ticket.estimatedDeliveryDate
                        ? new Intl.DateTimeFormat("en-IN", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(ticket.estimatedDeliveryDate))
                        : "No due date"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Stock & Accessory Demands Board */}
      <StockDemandBoard
        onOpenNewStockOrder={() => setIsStockModalOpen(true)}
        refreshTrigger={stockRefreshTrigger}
      />

      {/* Drilldown Drawer & Modals */}
      <MetricDrilldownDrawer
        metric={activeMetric}
        onClose={() => setActiveMetric(null)}
        onSelectMetric={setActiveMetric}
        tickets={tickets}
        role="SALESMAN"
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
