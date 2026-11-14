"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, LayoutGrid, List, Plus, Phone, MessageCircle, AlertTriangle, Search, X } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { RepairKanban } from "@/components/kanban/RepairKanban";
import { useAuthGuard } from "@/hooks/useAuth";
import { api, getCachedApi } from "@/lib/api";
import { Ticket } from "@/lib/types";
import { cn, formatCurrency, formatStatus } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { PageLoading, Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/context/StoreContext";
import { useNavigationState } from "@/hooks/useNavigationState";

function statusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP") return "warning";
  if (status === "NOT_REPAIRABLE_READY_FOR_PICKUP") return "warning";
  if (status.includes("WAITING")) return "warning";
  if (status === "RETURNED_UNREPAIRED") return "destructive";
  return "default";
}

function formatCompactStatus(status: string): string {
  switch (status) {
    case "DEVICE_RECEIVED":
      return "Received";
    case "IN_PROGRESS":
      return "In Progress";
    case "READY_FOR_PICKUP":
      return "Ready";
    case "NOT_REPAIRABLE_READY_FOR_PICKUP":
      return "Cannot Repair";
    case "DELIVERED":
      return "Delivered";
    case "WAITING_FOR_PARTS":
      return "Waiting Parts";
    case "WAITING_FOR_APPROVAL":
      return "Waiting Approval";
    case "RETURNED_UNREPAIRED":
      return "Unrepaired";
    case "REOPENED_FOR_RECHECK":
      return "Re-Check";
    default:
      return formatStatus(status);
  }
}

function formatIntakeDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function TicketsPageContent() {
  const { user, loading: authLoading } = useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const { activeStore, activeStoreId } = useStore();
  const query = activeStoreId !== "ALL" ? `?storeId=${activeStoreId}` : "";
  const ticketsKey = `/tickets${query}`;

  const [tickets, setTickets] = useState<Ticket[]>(
    () => getCachedApi<Ticket[]>(ticketsKey) ?? []
  );
  const [loading, setLoading] = useState<boolean>(
    () => !getCachedApi<Ticket[]>(ticketsKey)
  );
  const [error, setError] = useState("");
  const [view, setView] = useNavigationState<"cards" | "board">("tickets_view", "cards");
  const [cardFilter, setCardFilter] = useNavigationState<string>("tickets_filter", "ALL");
  const [searchQuery, setSearchQuery] = useNavigationState<string>("tickets_search", "");

  const load = () => {
    const currentQuery = activeStoreId !== "ALL" ? `?storeId=${activeStoreId}` : "";
    const key = `/tickets${currentQuery}`;
    if (!getCachedApi(key)) {
      setLoading(true);
    }
    setError("");
    api<Ticket[]>(key)
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

  // Filter based on URL param or local chip selection + live search query
  const filtered = tickets.filter((t) => {
    // 1. Status Filter
    if (statusFilter && t.status !== statusFilter) return false;
    if (!statusFilter) {
      if (
        cardFilter === "ACTIVE" &&
        (t.status === "DELIVERED" ||
          t.status === "RETURNED_UNREPAIRED" ||
          t.status === "READY_FOR_PICKUP" ||
          t.status === "NOT_REPAIRABLE_READY_FOR_PICKUP")
      )
        return false;
      if (
        cardFilter === "READY" &&
        t.status !== "READY_FOR_PICKUP" &&
        t.status !== "NOT_REPAIRABLE_READY_FOR_PICKUP"
      )
        return false;
      if (cardFilter === "OVERDUE" && !isOverdue(t.estimatedDeliveryDate, t.status)) return false;
      if (cardFilter === "DELIVERED" && t.status !== "DELIVERED") return false;
    }

    // 2. Search Query (Token, Customer Name, Mobile, Brand, Model, Problem Description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchToken = t.trackingNumber?.toLowerCase().includes(q);
      const matchCustomer = t.customer?.fullName?.toLowerCase().includes(q);
      const matchMobile = t.customer?.mobile?.includes(q);
      const matchBrand = t.brand?.toLowerCase().includes(q);
      const matchModel = t.model?.toLowerCase().includes(q);
      const matchProblem = t.problemDescription?.toLowerCase().includes(q);
      return Boolean(matchToken || matchCustomer || matchMobile || matchBrand || matchModel || matchProblem);
    }

    return true;
  });

  const activeCount = tickets.filter(
    (t) =>
      t.status !== "DELIVERED" &&
      t.status !== "RETURNED_UNREPAIRED" &&
      t.status !== "READY_FOR_PICKUP" &&
      t.status !== "NOT_REPAIRABLE_READY_FOR_PICKUP"
  ).length;
  const readyCount = tickets.filter(
    (t) => t.status === "READY_FOR_PICKUP" || t.status === "NOT_REPAIRABLE_READY_FOR_PICKUP"
  ).length;
  const overdueCount = tickets.filter(
    (t) =>
      t.status !== "DELIVERED" &&
      t.status !== "RETURNED_UNREPAIRED" &&
      t.status !== "READY_FOR_PICKUP" &&
      t.status !== "NOT_REPAIRABLE_READY_FOR_PICKUP" &&
      isOverdue(t.estimatedDeliveryDate, t.status)
  ).length;
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

        {/* Filter Chips & Inline Search for Card View */}
        {view === "cards" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Chips */}
            {!statusFilter && (
              <div className="flex gap-2 overflow-x-auto pb-1 kanban-scroll items-center">
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

            {/* Inline Search Bar */}
            <div className="relative w-full sm:w-[280px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#767676]" />
              <input
                type="text"
                placeholder="Search token, customer, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-[10px] border border-[#EBEBEB] bg-white pl-8 pr-7 text-xs text-[#121212] placeholder-[#767676] focus:border-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#767676] hover:text-[#121212] cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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
                    "group relative flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-2xs hover:border-[#121212] hover:bg-[#F7F7F8] active:scale-[0.99] transition-all cursor-pointer min-h-[185px]",
                    overdueItem && "border-[#FDE8E8] bg-[#FDE8E8]/10"
                  )}
                >
                  <div className="space-y-2">
                    {/* Header: Tracking + Badges (NEVER WRAPS) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-nowrap overflow-hidden">
                        <span className="font-mono text-[13px] font-bold text-[#121212] shrink-0">
                          {t.trackingNumber}
                        </span>
                        {t.store && (
                          <span className="shrink-0 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-bold text-[#121212]">
                            {t.store.code}
                          </span>
                        )}
                        {t.reopenCount && t.reopenCount > 0 ? (
                          <span className="shrink-0 rounded-[4px] bg-[#FFF4EB] px-1.5 py-0.5 text-[10px] font-semibold text-[#B35300] border border-[#B35300]/20">
                            Re-Check
                          </span>
                        ) : null}
                        {((t.photos && t.photos.length > 0) || (t.photoCount && t.photoCount > 0)) && (
                          <span
                            className="shrink-0 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-medium text-[#767676] flex items-center gap-0.5"
                            title="Device photo stored for shelf verification"
                          >
                            <Camera className="h-3 w-3 text-[#767676]" />
                          </span>
                        )}
                      </div>

                      <Badge
                        variant={statusVariant(t.status)}
                        className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5"
                      >
                        {formatCompactStatus(t.status)}
                      </Badge>
                    </div>

                    {/* Device & Issue */}
                    <div>
                      <p
                        className="text-[14px] font-bold text-[#121212] truncate leading-tight"
                        title={`${t.brand} ${t.model}${t.color ? ` · ${t.color}` : ""}`}
                      >
                        {t.brand} {t.model}
                        {t.color && (
                          <span className="ml-1 text-[12px] font-medium text-[#767676]">· {t.color}</span>
                        )}
                      </p>

                      {/* Problem Description Snippet */}
                      {t.problemDescription ? (
                        <p
                          className="mt-1 text-[12px] text-[#767676] truncate leading-normal"
                          title={t.problemDescription}
                        >
                          <span className="font-medium text-[#121212]">Issue:</span> {t.problemDescription}
                        </p>
                      ) : (
                        <p className="mt-1 text-[12px] text-[#A3A3A3] italic leading-normal">
                          No issue notes
                        </p>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#121212] truncate">
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
                            className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                            title={`Call ${t.customer.fullName}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/91${cleanMobile}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#EAF6EE] text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 transition-all"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: Date + Technician & Balance */}
                  <div className="mt-3 pt-2.5 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#767676]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-[#121212]/80 shrink-0">
                        {formatIntakeDate(t.createdAt)}
                      </span>
                      <span>·</span>
                      <span className="truncate max-w-[110px]" title={t.assignedTechnicianName ?? "Unassigned"}>
                        {t.assignedTechnicianName ?? "Unassigned"}
                      </span>
                    </div>

                    {Number(t.balanceAmount) > 0 ? (
                      <span className="font-bold text-[12px] text-[#B35300] bg-[#FFF4EB] px-2 py-0.5 rounded-[4px] border border-[#B35300]/20">
                        Due: {formatCurrency(Number(t.balanceAmount))}
                      </span>
                    ) : (
                      <span className="font-medium text-[11px] text-[#767676] bg-[#F0F0F2] px-1.5 py-0.5 rounded-[4px]">
                        Paid
                      </span>
                    )}
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
