"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, LayoutGrid, List, Plus, Phone, MessageCircle, AlertTriangle } from "lucide-react";
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
import { useStore } from "@/context/StoreContext";

function statusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP") return "warning";
  if (status.includes("WAITING")) return "warning";
  if (status === "RETURNED_UNREPAIRED") return "destructive";
  return "default";
}

export default function TicketsPageContent() {
  const { user, loading: authLoading } = useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const { activeStore, activeStoreId } = useStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"cards" | "board">("cards");
  const [cardFilter, setCardFilter] = useState<string>("ALL");

  const load = () => {
    setLoading(true);
    setError("");
    const query = activeStoreId !== "ALL" ? `?storeId=${activeStoreId}` : "";
    api<Ticket[]>(`/tickets${query}`)
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tickets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === "TECHNICIAN") setView("board");
    load();
  }, [authLoading, user, activeStoreId]);

  useEffect(() => {
    const handleFmRefresh = () => {
      load();
    };
    window.addEventListener("fm:refresh", handleFmRefresh);
    return () => window.removeEventListener("fm:refresh", handleFmRefresh);
  }, [activeStoreId]);

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

  const activeCount = tickets.filter(
    (t) => t.status !== "DELIVERED" && t.status !== "RETURNED_UNREPAIRED"
  ).length;
  const readyCount = tickets.filter((t) => t.status === "READY_FOR_PICKUP").length;
  const overdueCount = tickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status)).length;
  const deliveredCount = tickets.filter((t) => t.status === "DELIVERED").length;

  const storeDisplay =
    activeStoreId === "ALL"
      ? "All Stores"
      : activeStore?.displayName || activeStore?.name || "Main Store";

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-5 animate-fade-in text-[#121212]">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">
              Repairs
            </h1>
            <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
              {storeDisplay} · {tickets.length} total tickets
            </p>
            {statusFilter && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-[#767676]">
                  Filtered: <strong className="text-[#121212]">{formatStatus(statusFilter)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/tickets")}
                  className="text-xs text-[#121212] font-semibold underline hover:no-underline cursor-pointer"
                >
                  Clear filter ×
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded-[10px] border border-[#EBEBEB] bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors cursor-pointer",
                  view === "cards"
                    ? "bg-[#F0F0F2] text-[#121212]"
                    : "text-[#767676] hover:text-[#121212]"
                )}
                aria-label="Card view"
                title="Card view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors cursor-pointer",
                  view === "board"
                    ? "bg-[#F0F0F2] text-[#121212]"
                    : "text-[#767676] hover:text-[#121212]"
                )}
                aria-label="Board view"
                title="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Link href="/tickets/new">
              <Button variant="primary" className="h-10 px-4 text-[13px] font-semibold gap-1.5 shadow-xs cursor-pointer">
                <Plus className="h-4 w-4" />
                <span>New Repair</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Chips for Card View */}
        {view === "cards" && !statusFilter && (
          <div className="flex gap-2 overflow-x-auto pb-1 kanban-scroll">
            <button
              type="button"
              onClick={() => setCardFilter("ALL")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                cardFilter === "ALL"
                  ? "bg-[#121212] text-white shadow-2xs"
                  : "bg-white text-[#121212] border border-[#EBEBEB] hover:bg-[#F7F7F8]"
              )}
            >
              <span>All</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  cardFilter === "ALL" ? "bg-white/20 text-white" : "bg-[#F0F0F2] text-[#767676]"
                )}
              >
                {tickets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCardFilter("ACTIVE")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                cardFilter === "ACTIVE"
                  ? "bg-[#121212] text-white shadow-2xs"
                  : "bg-white text-[#121212] border border-[#EBEBEB] hover:bg-[#F7F7F8]"
              )}
            >
              <span>Active</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  cardFilter === "ACTIVE" ? "bg-white/20 text-white" : "bg-[#F0F0F2] text-[#767676]"
                )}
              >
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCardFilter("READY")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                cardFilter === "READY"
                  ? "bg-[#121212] text-white shadow-2xs"
                  : "bg-white text-[#121212] border border-[#EBEBEB] hover:bg-[#F7F7F8]"
              )}
            >
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0E8345]" />
                Ready for Pickup
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  cardFilter === "READY" ? "bg-white/20 text-white" : "bg-[#F0F0F2] text-[#767676]"
                )}
              >
                {readyCount}
              </span>
            </button>

            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => setCardFilter("OVERDUE")}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  cardFilter === "OVERDUE"
                    ? "bg-[#C5221F] text-white shadow-2xs"
                    : "bg-[#FDE8E8]/60 text-[#C5221F] border border-[#FDE8E8] hover:bg-[#FDE8E8]"
                )}
              >
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C5221F]" />
                  Overdue
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    cardFilter === "OVERDUE" ? "bg-white/20 text-white" : "bg-[#FDE8E8] text-[#C5221F]"
                  )}
                >
                  {overdueCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCardFilter("DELIVERED")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                cardFilter === "DELIVERED"
                  ? "bg-[#121212] text-white shadow-2xs"
                  : "bg-white text-[#121212] border border-[#EBEBEB] hover:bg-[#F7F7F8]"
              )}
            >
              <span>Delivered</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  cardFilter === "DELIVERED" ? "bg-white/20 text-white" : "bg-[#F0F0F2] text-[#767676]"
                )}
              >
                {deliveredCount}
              </span>
            </button>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-36 rounded-[12px]" />
            ))}
          </div>
        ) : view === "board" ? (
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <RepairKanban tickets={filtered} onUpdate={load} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No repair tickets yet"
            description="Create your first repair ticket to get started."
            actionLabel="New Repair"
            onAction={() => (window.location.href = "/tickets/new")}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              const cleanMobile = t.customer?.mobile
                ? t.customer.mobile.replace(/\D/g, "").slice(-10)
                : "";
              const waText = encodeURIComponent(
                `Hello ${t.customer?.fullName || "Customer"}, regarding your ${t.brand} ${t.model} (${t.trackingNumber}) at Famous Mobiles:`
              );
              const overdueItem = isOverdue(t.estimatedDeliveryDate, t.status);

              return (
                <div
                  key={t.id}
                  onClick={() => router.push(`/tickets/view?id=${t.id}`)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] active:scale-[0.99] transition-all cursor-pointer",
                    overdueItem && "border-[#FDE8E8] bg-[#FDE8E8]/10"
                  )}
                >
                  <div>
                    {/* Header: Tracking + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[13px] font-bold text-[#121212]">
                          {t.trackingNumber}
                        </span>
                        {t.store && (
                          <span className="rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-bold text-[#121212]">
                            {t.store.code}
                          </span>
                        )}
                        {t.reopenCount && t.reopenCount > 0 ? (
                          <span className="rounded-[4px] bg-[#FFF4EB] px-1.5 py-0.5 text-[10px] font-semibold text-[#B35300] border border-[#B35300]/20">
                            Re-Check ({t.reopenCount}x)
                          </span>
                        ) : null}
                        {((t.photos && t.photos.length > 0) || (t.photoCount && t.photoCount > 0)) && (
                          <span
                            className="rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-medium text-[#767676] flex items-center gap-1"
                            title="Device photo stored for shelf verification"
                          >
                            <Camera className="h-3 w-3 text-[#767676]" /> Photo
                          </span>
                        )}
                      </div>

                      <Badge variant={statusVariant(t.status)}>{formatStatus(t.status)}</Badge>
                    </div>

                    {/* Device */}
                    <p className="mt-2 text-[15px] font-bold text-[#121212] leading-tight">
                      {t.brand} {t.model}
                      {t.color && (
                        <span className="ml-1 text-[12px] font-medium text-[#767676]">· {t.color}</span>
                      )}
                    </p>

                    {/* Customer */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#767676] truncate">
                          {t.customer.fullName}
                        </p>
                        {cleanMobile && (
                          <p className="text-[11px] text-[#767676] font-mono mt-0.5">{cleanMobile}</p>
                        )}
                      </div>

                      {/* Direct Call & WhatsApp Actions */}
                      {cleanMobile && (
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={`tel:${cleanMobile}`}
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                            title={`Call ${t.customer.fullName}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/91${cleanMobile}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAF6EE] text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 transition-all"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: Technician & Balance */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#767676]">
                    <span className="truncate">{t.assignedTechnicianName ?? "Unassigned"}</span>
                    <span
                      className={cn(
                        "font-bold text-[13px]",
                        Number(t.balanceAmount) > 0 ? "text-[#B35300]" : "text-[#0E8345]"
                      )}
                    >
                      {formatCurrency(Number(t.balanceAmount))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
