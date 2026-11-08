"use client";

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { PageLoading } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { api, getCachedApi } from "@/lib/api";
import { DashboardMetrics, Ticket } from "@/lib/types";
import { ReceptionDashboard } from "@/components/dashboard/ReceptionDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { TechnicianHome } from "@/components/dashboard/TechnicianHome";
import { useStore } from "@/context/StoreContext";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const { activeStoreId } = useStore();
  const query = activeStoreId !== "ALL" ? `?storeId=${activeStoreId}` : "";
  const metricsKey = `/dashboard/metrics${query}`;
  const ticketsKey = `/tickets${query}`;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(
    () => getCachedApi<DashboardMetrics>(metricsKey) ?? null
  );
  const [tickets, setTickets] = useState<Ticket[]>(
    () => getCachedApi<Ticket[]>(ticketsKey) ?? []
  );
  const [loading, setLoading] = useState<boolean>(
    () => !getCachedApi<DashboardMetrics>(metricsKey)
  );
  const [error, setError] = useState("");

  const load = () => {
    const currentQuery = activeStoreId !== "ALL" ? `?storeId=${activeStoreId}` : "";
    const mKey = `/dashboard/metrics${currentQuery}`;
    if (!getCachedApi(mKey)) {
      setLoading(true);
    }
    setError("");
    Promise.all([
      api<DashboardMetrics>(mKey),
      api<Ticket[]>(`/tickets${currentQuery}`),
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
