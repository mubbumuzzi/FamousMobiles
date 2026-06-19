"use client";

import dynamic from "next/dynamic";
import { BarChart3, IndianRupee, Package, TrendingUp, Users, Wrench } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMetrics, Ticket } from "@/lib/types";
import { formatCurrency, formatStatus } from "@/lib/utils";

const StatusPieChart = dynamic(
  () => import("@/components/dashboard/StatusPieChart").then((m) => m.StatusPieChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

type AdminDashboardProps = {
  metrics: DashboardMetrics | null;
  tickets: Ticket[];
  loading: boolean;
  error: string;
};

export function AdminDashboard({ metrics, tickets, loading, error }: AdminDashboardProps) {
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
  const active = tickets.filter((t) => t.status !== "DELIVERED").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Executive Overview</h1>
        <p className="text-sm text-slate-500">Business performance at a glance</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue Today" value={loading ? null : formatCurrency(Number(metrics?.revenueToday ?? 0))} icon={IndianRupee} tone="success" />
        <KpiCard label="Revenue This Month" value={loading ? null : formatCurrency(Number(metrics?.revenueThisMonth ?? 0))} icon={TrendingUp} tone="primary" />
        <KpiCard label="Active Repairs" value={loading ? null : active} icon={Wrench} tone="accent" />
        <KpiCard label="Delivered" value={loading ? null : delivered} icon={Package} tone="secondary" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Received Today" value={loading ? null : metrics?.devicesReceivedToday ?? 0} tone="secondary" />
        <KpiCard label="Ready Pickup" value={loading ? null : metrics?.readyForPickup ?? 0} tone="success" />
        <KpiCard label="Waiting Parts" value={loading ? null : metrics?.waitingForParts ?? 0} tone="warning" />
        <KpiCard label="Delivered Today" value={loading ? null : metrics?.deliveredToday ?? 0} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="premium-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <BarChart3 className="h-4 w-4 text-blue-600" /> Status Breakdown
          </h2>
          <div className="h-64">
            <StatusPieChart data={statusData} />
          </div>
        </div>
        <div className="premium-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <Users className="h-4 w-4 text-violet-600" /> Top Device Brands
          </h2>
          <div className="space-y-3">
            {topBrands.length === 0 && <p className="text-sm text-slate-500">No data yet</p>}
            {topBrands.map(([brand, count]) => (
              <div key={brand}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{brand}</span>
                  <span className="text-slate-500">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500"
                    style={{ width: `${Math.min(100, (count / (tickets.length || 1)) * 100 * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
