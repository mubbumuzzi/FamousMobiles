"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { DashboardMetrics } from "@/lib/types";
import { formatCurrency, formatStatus } from "@/lib/utils";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#64748b", "#059669"];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    api<DashboardMetrics>("/dashboard/metrics").then(setMetrics).catch(console.error);
  }, []);

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  const statusData = metrics
    ? Object.entries(metrics.statusBreakdown).map(([name, value]) => ({ name: formatStatus(name), value }))
    : [];

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Repair & revenue overview</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Received Today", value: metrics?.devicesReceivedToday ?? 0 },
            { label: "Under Repair", value: metrics?.devicesUnderRepair ?? 0 },
            { label: "Waiting Parts", value: metrics?.waitingForParts ?? 0 },
            { label: "Ready Pickup", value: metrics?.readyForPickup ?? 0 },
          ].map((m) => (
            <Card key={m.label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-blue-700">{m.value}</p>
                <p className="text-xs text-slate-500">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue Today</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">{formatCurrency(Number(metrics?.revenueToday ?? 0))}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">This Week</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">{formatCurrency(Number(metrics?.revenueThisWeek ?? 0))}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">This Month</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">{formatCurrency(Number(metrics?.revenueThisMonth ?? 0))}</p></CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Link href="/tickets/new" className="block rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700">
                New Repair Ticket
              </Link>
              <Link href="/search" className="block rounded-lg border px-4 py-3 text-center text-sm font-medium hover:bg-slate-50">
                Search Records
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </StaffLayout>
  );
}
