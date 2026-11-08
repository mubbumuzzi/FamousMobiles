"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardMetrics, MetricDrilldownType, Ticket } from "@/lib/types";
import { formatCurrency, formatStatus, formatDate, isSameDay, cn } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { MetricDrilldownDrawer } from "@/components/dashboard/MetricDrilldownDrawer";
import { StockDemandSnapshot } from "@/components/dashboard/StockDemandSnapshot";
import { StockOrderModal } from "@/components/stock/StockOrderModal";
import { useStore } from "@/context/StoreContext";

const StatusPieChart = dynamic(
  () => import("@/components/dashboard/StatusPieChart").then((m) => m.StatusPieChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

type AdminDashboardProps = {
  metrics: DashboardMetrics | null;
  tickets: Ticket[];
  loading: boolean;
  error: string;
  onRefresh?: () => void;
};

export function AdminDashboard({ metrics, tickets, loading, error, onRefresh }: AdminDashboardProps) {
  const { activeStore, activeStoreId } = useStore();
  const [activeMetric, setActiveMetric] = useState<MetricDrilldownType | null>(null);
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
      helper: "Day-end total",
      dot: null,
    },
    {
      key: "revenueMonth" as MetricDrilldownType,
      label: "Revenue (Month)",
      value: loading ? null : formatCurrency(Number(metrics?.revenueThisMonth ?? 0)),
      helper: "Monthly billing",
      dot: null,
    },
    {
      key: "activeRepairs" as MetricDrilldownType,
      label: "Active Repairs",
      value: loading ? null : activeCount,
      helper: overdueCount > 0 ? `${overdueCount} overdue` : "In workshop",
      dot: null,
    },
    {
      key: "readyPickup" as MetricDrilldownType,
      label: "Ready Pickup",
      value: loading ? null : (metrics?.readyForPickup ?? 0),
      helper: "Verified & waiting",
      dot: "bg-[#0E8345]", // green dot for ready status
    },
    {
      key: "receivedToday" as MetricDrilldownType,
      label: "Received Today",
      value: loading ? null : (tickets.length > 0 ? receivedTodayCount : metrics?.devicesReceivedToday ?? 0),
      helper: "New intakes",
      dot: null,
    },
    {
      key: "deliveredToday" as MetricDrilldownType,
      label: "Delivered Today",
      value: loading ? null : (tickets.length > 0 ? deliveredTodayCount : metrics?.deliveredToday ?? 0),
      helper: "Returned today",
      dot: null,
    },
    {
      key: "waitingParts" as MetricDrilldownType,
      label: "Waiting Parts",
      value: loading ? null : (metrics?.waitingForParts ?? 0),
      helper: "Awaiting spare parts",
      dot: "bg-[#B35300]", // amber dot for waiting status
    },
    {
      key: "deliveredAll" as MetricDrilldownType,
      label: "Total Delivered",
      value: loading ? null : delivered,
      helper: "All-time completed",
      dot: null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-[#121212]">
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

        <Link href="/tickets/new">
          <Button variant="primary" className="h-10 px-4 text-[13px] font-semibold gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>New Repair</span>
          </Button>
        </Link>
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

                {/* Optional Helper Text at bottom */}
                <p className="text-[11px] leading-[14px] text-[#767676] truncate">
                  {cell.helper}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Quick Actions: row of 4 equal cards (desktop), 2x2 grid (mobile). 'New Repair' is filled near-black. */}
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

          {/* Card 2: Order Stock */}
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

          {/* Card 3: Active Repairs */}
          <Link
            href="/tickets"
            className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#DFDFDF] hover:bg-[#FDFDFD] active:scale-[0.98] min-h-[104px] sm:min-h-[112px] group cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] mb-2 group-hover:bg-white border border-[#EBEBEB] transition-colors">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] leading-[20px] font-bold text-[#121212]">Active Repairs</p>
              <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">Manage repair board</p>
            </div>
          </Link>

          {/* Card 4: Search */}
          <Link
            href="/search"
            className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#DFDFDF] hover:bg-[#FDFDFD] active:scale-[0.98] min-h-[104px] sm:min-h-[112px] group cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] mb-2 group-hover:bg-white border border-[#EBEBEB] transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] leading-[20px] font-bold text-[#121212]">Search</p>
              <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">Customer or IMEI</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Active Repairs Section: "Active repairs" heading with "See all", then horizontal scroll on mobile, 2-3 col grid on desktop */}
      <section aria-label="Recent Active Repairs" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] leading-[20px] font-bold text-[#121212]">
            Active Repairs
            {activeCount > 0 && (
              <span className="text-[13px] font-normal text-[#767676] ml-2">
                {activeCount} in progress
              </span>
            )}
          </h2>
          <Link
            href="/tickets"
            className="text-[13px] font-semibold text-[#121212] hover:underline"
          >
            See all
          </Link>
        </div>

        {activeRepairs.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#EBEBEB] bg-white p-8 text-center text-[13px] text-[#767676]">
            No active repairs in workshop. Click &quot;New Repair&quot; to intake a device.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
            {activeRepairs.slice(0, 6).map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/view?id=${ticket.id}`}
                className="w-[260px] sm:w-auto shrink-0 snap-start flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 sm:p-4 hover:border-[#DFDFDF] hover:bg-[#FCFCFD] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-[12px] font-bold text-[#121212]">
                      {ticket.trackingNumber}
                    </span>
                    <Badge variant="default" className="text-[11px] px-2 py-0.2">
                      {formatStatus(ticket.status)}
                    </Badge>
                  </div>
                  <p className="text-[14px] leading-[20px] font-bold text-[#121212] truncate">
                    {ticket.brand} {ticket.model}
                  </p>
                  <p className="text-[12px] leading-[16px] text-[#767676] truncate mt-0.5">
                    {ticket.customer?.fullName} · {ticket.customer?.mobile}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#EBEBEB] pt-2.5 mt-2.5 text-[12px] text-[#767676]">
                  <span className="font-semibold text-[#121212]">
                    {formatCurrency(ticket.estimatedCost)}
                  </span>
                  {ticket.estimatedDeliveryDate && (
                    <span className="text-[11px] flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#767676]" />
                      {formatDate(ticket.estimatedDeliveryDate)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
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
