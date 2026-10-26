"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Package, PackageCheck, Plus, Search, Truck, Wrench } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { QuickAction } from "@/components/ui/quick-action";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMetrics, MetricDrilldownType, Ticket } from "@/lib/types";
import { formatCurrency, formatStatus } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { MetricDrilldownDrawer } from "@/components/dashboard/MetricDrilldownDrawer";

type ReceptionDashboardProps = {
  metrics: DashboardMetrics | null;
  tickets: Ticket[];
  loading: boolean;
  error: string;
  showRevenue?: boolean;
  onRefresh?: () => void;
};

export function ReceptionDashboard({ metrics, tickets, loading, error, showRevenue, onRefresh }: ReceptionDashboardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricDrilldownType | null>(null);

  const overdue = tickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status) && t.status !== "DELIVERED");
  const ready = tickets.filter((t) => t.status === "READY_FOR_PICKUP");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Good day 👋</h1>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening at the shop today · Tap any card to inspect</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Active Repairs"
          value={loading ? null : metrics?.devicesUnderRepair ?? 0}
          icon={Wrench}
          tone="primary"
          onClick={() => setActiveMetric("activeRepairs")}
          isSelected={activeMetric === "activeRepairs"}
        />
        <KpiCard
          label="Ready for Pickup"
          value={loading ? null : metrics?.readyForPickup ?? 0}
          icon={PackageCheck}
          tone="success"
          onClick={() => setActiveMetric("readyPickup")}
          isSelected={activeMetric === "readyPickup"}
        />
        <KpiCard
          label="Received Today"
          value={loading ? null : metrics?.devicesReceivedToday ?? 0}
          icon={Package}
          tone="secondary"
          onClick={() => setActiveMetric("receivedToday")}
          isSelected={activeMetric === "receivedToday"}
        />
        <KpiCard
          label="Overdue"
          value={loading ? null : overdue.length}
          icon={AlertTriangle}
          tone={overdue.length > 0 ? "danger" : "accent"}
          subtitle={overdue.length > 0 ? "Needs attention" : "All on track"}
          onClick={() => setActiveMetric("overdue")}
          isSelected={activeMetric === "overdue"}
        />
      </div>

      {showRevenue && (
        <KpiCard
          label="Revenue Today"
          value={loading ? null : formatCurrency(Number(metrics?.revenueToday ?? 0))}
          tone="success"
          className="max-w-xs"
          onClick={() => setActiveMetric("revenueToday")}
          isSelected={activeMetric === "revenueToday"}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickAction href="/tickets/new" icon={Plus} label="New Repair" description="Start intake" tone="primary" />
        <QuickAction href="/search" icon={Search} label="Search" description="Find customer" tone="secondary" />
        <QuickAction href="/tickets?status=READY_FOR_PICKUP" icon={Truck} label="Deliver Device" description="Ready pickups" tone="success" />
        <QuickAction href="/tickets" icon={Package} label="All Tickets" description="View list" tone="accent" />
      </div>

      {ready.length > 0 && (
        <section className="premium-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Ready for Pickup ({ready.length})</h2>
            <button
              type="button"
              onClick={() => setActiveMetric("readyPickup")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Open Pickup Drawer ➔
            </button>
          </div>
          <div className="space-y-2">
            {ready.slice(0, 5).map((t) => (
              <Link key={t.id} href={`/tickets/view?id=${t.id}`} className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 transition-colors hover:bg-emerald-100">
                <div>
                  <p className="font-semibold text-slate-900">{t.customer.fullName}</p>
                  <p className="text-xs text-slate-600">{t.brand} {t.model} · {t.trackingNumber}</p>
                </div>
                <span className="text-xs font-bold text-emerald-700">Collect</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {overdue.length > 0 && (
        <section className="premium-card border-red-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-red-800">Overdue Repairs ({overdue.length})</h2>
            <button
              type="button"
              onClick={() => setActiveMetric("overdue")}
              className="text-xs font-semibold text-red-700 hover:underline"
            >
              Review Overdue ➔
            </button>
          </div>
          <div className="space-y-2">
            {overdue.slice(0, 5).map((t) => (
              <Link key={t.id} href={`/tickets/view?id=${t.id}`} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 hover:bg-red-100">
                <div>
                  <p className="font-semibold text-slate-900">{t.trackingNumber}</p>
                  <p className="text-xs text-slate-600">{formatStatus(t.status)} · {t.customer.fullName}</p>
                </div>
                <span className="text-xs font-bold text-red-700">Needs Attention</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading && <Skeleton className="h-24 w-full" />}

      <MetricDrilldownDrawer
        metric={activeMetric}
        onClose={() => setActiveMetric(null)}
        onSelectMetric={setActiveMetric}
        tickets={tickets}
        role="SALESMAN"
        onTicketUpdated={onRefresh || (() => {})}
        devicesReceivedToday={metrics?.devicesReceivedToday ?? 0}
        devicesDeliveredToday={metrics?.deliveredToday ?? 0}
      />
    </div>
  );
}
