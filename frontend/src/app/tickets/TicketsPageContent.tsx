"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"cards" | "board">("cards");
  const [cardFilter, setCardFilter] = useState<string>("ALL");

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

  // Filter based on URL param or local chip selection
  const filtered = statusFilter
    ? tickets.filter((t) => t.status === statusFilter)
    : cardFilter === "ACTIVE"
    ? tickets.filter((t) => t.status !== "DELIVERED" && t.status !== "RETURNED_UNREPAIRED")
    : cardFilter === "READY"
    ? tickets.filter((t) => t.status === "READY_FOR_PICKUP")
    : cardFilter === "OVERDUE"
    ? tickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status))
    : cardFilter === "DELIVERED"
    ? tickets.filter((t) => t.status === "DELIVERED")
    : tickets;

  const activeCount = tickets.filter((t) => t.status !== "DELIVERED" && t.status !== "RETURNED_UNREPAIRED").length;
  const readyCount = tickets.filter((t) => t.status === "READY_FOR_PICKUP").length;
  const overdueCount = tickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status)).length;
  const deliveredCount = tickets.filter((t) => t.status === "DELIVERED").length;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Repairs</h1>
            {statusFilter && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">Filtered: <strong>{formatStatus(statusFilter)}</strong></span>
                <button
                  type="button"
                  onClick={() => router.push("/tickets")}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  Clear filter ×
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={cn("rounded-lg p-2 touch-target transition-all", view === "cards" ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-500 hover:text-slate-700")}
                aria-label="Card view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn("rounded-lg p-2 touch-target transition-all", view === "board" ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-500 hover:text-slate-700")}
                aria-label="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Link href="/tickets/new"><Button size="lg"><Plus className="h-5 w-5" /> New</Button></Link>
          </div>
        </div>

        {/* Quick Filter Chips for Card View */}
        {view === "cards" && !statusFilter && (
          <div className="flex gap-2 overflow-x-auto kanban-scroll pb-1">
            <button
              type="button"
              onClick={() => setCardFilter("ALL")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all touch-target",
                cardFilter === "ALL" ? "bg-slate-900 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>All</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", cardFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                {tickets.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCardFilter("ACTIVE")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all touch-target",
                cardFilter === "ACTIVE" ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>Active</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", cardFilter === "ACTIVE" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700")}>
                {activeCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCardFilter("READY")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all touch-target",
                cardFilter === "READY" ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>Ready for Pickup</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", cardFilter === "READY" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700")}>
                {readyCount}
              </span>
            </button>
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => setCardFilter("OVERDUE")}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all touch-target",
                  cardFilter === "OVERDUE" ? "bg-red-600 text-white shadow-xs" : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
                )}
              >
                <span>⚠️ Overdue</span>
                <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", cardFilter === "OVERDUE" ? "bg-white/20 text-white" : "bg-red-100 text-red-800")}>
                  {overdueCount}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCardFilter("DELIVERED")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all touch-target",
                cardFilter === "DELIVERED" ? "bg-slate-700 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>Delivered</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", cardFilter === "DELIVERED" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                {deliveredCount}
              </span>
            </button>
          </div>
        )}

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
