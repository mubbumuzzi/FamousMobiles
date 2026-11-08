"use client";

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { PageLoading } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { DashboardMetrics, Ticket } from "@/lib/types";
import { ReceptionDashboard } from "@/components/dashboard/ReceptionDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { TechnicianHome } from "@/components/dashboard/TechnicianHome";
import { useStore } from "@/context/StoreContext";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const { activeStoreId } = useStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    const query = activeStoreId !== "ALL" ? `?storeId=${activeStoreId}` : "";
    Promise.all([
      api<DashboardMetrics>(`/dashboard/metrics${query}`),
      api<Ticket[]>(`/tickets${query}`),
    ])
      .then(([m, t]) => {
        setMetrics(m);
        setTickets(t);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [authLoading, user, activeStoreId]);

  useEffect(() => {
    const handleFmRefresh = () => {
      load();
    };
    window.addEventListener("fm:refresh", handleFmRefresh);
    return () => window.removeEventListener("fm:refresh", handleFmRefresh);
  }, [activeStoreId]);

  if (authLoading) return <PageLoading label="Loading dashboard..." />;

  const role = user?.role;

  return (
    <StaffLayout userName={user?.fullName} role={role}>
      {role === "ADMIN" && (
        <AdminDashboard metrics={metrics} tickets={tickets} loading={loading} error={error} onRefresh={load} />
      )}
      {role === "TECHNICIAN" && (
        <TechnicianHome tickets={tickets} userName={user?.fullName} loading={loading} onRefresh={load} />
      )}
      {(role === "SALESMAN" || !role) && (
        <ReceptionDashboard
          metrics={metrics}
          tickets={tickets}
          loading={loading}
          error={error}
          showRevenue={false}
          onRefresh={load}
        />
      )}
    </StaffLayout>
  );
}
