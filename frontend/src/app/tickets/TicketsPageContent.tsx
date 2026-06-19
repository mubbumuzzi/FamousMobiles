"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Plus } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { RepairKanban } from "@/components/kanban/RepairKanban";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Ticket } from "@/lib/types";
import { cn, formatCurrency, formatStatus } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { PageLoading, Skeleton } from "@/components/ui/skeleton";

function statusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP") return "warning";
  if (status.includes("WAITING")) return "warning";
  return "default";
}

export default function TicketsPageContent() {
  const { user, loading: authLoading } = useAuthGuard();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"cards" | "board">("cards");

  const load = () => {
    setLoading(true);
    setError("");
    api<Ticket[]>("/tickets")
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tickets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === "TECHNICIAN") setView("board");
    load();
  }, [authLoading, user]);

  if (authLoading) return <PageLoading />;

  const filtered = statusFilter ? tickets.filter((t) => t.status === statusFilter) : tickets;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Repairs</h1>
            {statusFilter && <p className="text-sm text-slate-500">Filtered: {formatStatus(statusFilter)}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button type="button" onClick={() => setView("cards")} className={cn("rounded-lg p-2 touch-target", view === "cards" ? "bg-blue-100 text-blue-700" : "text-slate-500")} aria-label="Card view">
                <List className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView("board")} className={cn("rounded-lg p-2 touch-target", view === "board" ? "bg-blue-100 text-blue-700" : "text-slate-500")} aria-label="Board view">
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Link href="/tickets/new"><Button size="lg"><Plus className="h-5 w-5" /> New</Button></Link>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : view === "board" ? (
          <RepairKanban tickets={filtered} onUpdate={load} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Plus} title="No repair tickets yet" description="Create your first repair ticket to get started." actionLabel="New Repair" onAction={() => (window.location.href = "/tickets/new")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Link key={t.id} href={`/tickets/${t.id}`} className={cn("premium-card block p-4 transition-transform hover:-translate-y-0.5", isOverdue(t.estimatedDeliveryDate, t.status) && "border-red-200")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-blue-700">{t.trackingNumber}</p>
                  <Badge variant={statusVariant(t.status)}>{formatStatus(t.status)}</Badge>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">{t.brand} {t.model}</p>
                <p className="text-sm text-slate-600">{t.customer.fullName}</p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-500">{t.assignedTechnicianName ?? "Unassigned"}</span>
                  <span className="font-semibold">{formatCurrency(Number(t.balanceAmount))}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
