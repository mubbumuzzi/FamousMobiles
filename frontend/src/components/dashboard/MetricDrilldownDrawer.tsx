"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  IndianRupee,
  MessageCircle,
  Package,
  PackageCheck,
  Phone,
  Printer,
  Search,
  Share2,
  TrendingUp,
  Truck,
  User,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, API_URL, getAccessToken } from "@/lib/api";
import { printTicketReceipt } from "@/lib/print";
import {
  DetailedPayment,
  MetricDrilldownType,
  Ticket,
  TodayRevenueSummary,
  UserRole,
} from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatStatus,
  getWarrantyStatus,
  getVipStatus,
  isSameDay,
} from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import {
  buildWhatsAppPickupUrl,
  buildWhatsAppDelayUrl,
  buildWhatsAppDayEndSummaryUrl,
} from "@/lib/whatsapp";

type MetricDrilldownDrawerProps = {
  metric: MetricDrilldownType | null;
  onClose: () => void;
  onSelectMetric: (m: MetricDrilldownType) => void;
  tickets: Ticket[];
  role?: UserRole;
  onTicketUpdated: () => void;
  devicesReceivedToday?: number;
  devicesDeliveredToday?: number;
};

const METRIC_TABS: { key: MetricDrilldownType; label: string; adminOnly?: boolean }[] = [
  { key: "activeRepairs", label: "Active Repairs" },
  { key: "readyPickup", label: "Ready Pickup" },
  { key: "receivedToday", label: "Received Today" },
  { key: "deliveredToday", label: "Delivered Today" },
  { key: "deliveredAll", label: "All Delivered", adminOnly: true },
  { key: "waitingParts", label: "Waiting Parts" },
  { key: "revenueToday", label: "Revenue Today", adminOnly: true },
];

export function MetricDrilldownDrawer({
  metric,
  onClose,
  onSelectMetric,
  tickets,
  role,
  onTicketUpdated,
  devicesReceivedToday = 0,
  devicesDeliveredToday = 0,
}: MetricDrilldownDrawerProps) {
  const [search, setSearch] = useState("");
  const [revenueSummary, setRevenueSummary] = useState<TodayRevenueSummary | null>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [printingTicketId, setPrintingTicketId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState("");

  const handlePrintTicket = async (ticket: Ticket) => {
    setPrintingTicketId(ticket.id);
    try {
      await printTicketReceipt(ticket.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load receipt PDF");
    } finally {
      setPrintingTicketId(null);
    }
  };

  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 1. Focus management: preserve previous element, shift focus to search input on mount, restore on unmount
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    return () => {
      clearTimeout(timer);
      previousActiveElement.current?.focus();
    };
  }, []);

  // 2. Keyboard accessibility: Escape to dismiss, Tab focus trap within drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Load today's revenue breakdown if metric is revenueToday and user is admin
  useEffect(() => {
    if (metric === "revenueToday" && role === "ADMIN") {
      setLoadingRevenue(true);
      api<TodayRevenueSummary>("/payments/today")
        .then(setRevenueSummary)
        .catch(console.error)
        .finally(() => setLoadingRevenue(false));
    }
  }, [metric, role]);

  // Compute customer repair counts for VIP/Repeat customer badge
  const customerRepairCounts = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      const cid = t.customer?.id;
      if (cid) map.set(cid, (map.get(cid) || 0) + 1);
    });
    return map;
  }, [tickets]);

  // Filter tickets based on active metric
  const filteredTickets = useMemo(() => {
    if (!metric) return [];
    let list: Ticket[] = [];

    switch (metric) {
      case "activeRepairs":
        list = tickets.filter(
          (t) =>
            t.status !== "DELIVERED" &&
            t.status !== "RETURNED_UNREPAIRED" &&
            t.status !== "READY_FOR_PICKUP"
        );
        break;
      case "readyPickup":
        list = tickets.filter((t) => t.status === "READY_FOR_PICKUP");
        break;
      case "receivedToday":
        list = tickets.filter((t) => isSameDay(t.createdAt));
        break;
      case "deliveredToday":
        list = tickets.filter((t) => t.status === "DELIVERED" && isSameDay(t.deliveredAt));
        break;
      case "waitingParts":
        list = tickets.filter((t) => t.status === "WAITING_FOR_PARTS");
        break;
      case "overdue":
        list = tickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status));
        break;
      case "deliveredAll":
        list = tickets.filter((t) => t.status === "DELIVERED");
        break;
      default:
        list = tickets;
        break;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((t) => {
      const matchTrack = t.trackingNumber?.toLowerCase().includes(q);
      const matchCust = t.customer?.fullName?.toLowerCase().includes(q);
      const matchMobile = t.customer?.mobile?.includes(q);
      const matchBrand = t.brand?.toLowerCase().includes(q);
      const matchModel = t.model?.toLowerCase().includes(q);
      const matchTech = t.assignedTechnicianName?.toLowerCase().includes(q);
      return matchTrack || matchCust || matchMobile || matchBrand || matchModel || matchTech;
    });
  }, [metric, tickets, search]);

  // Quick Reschedule EDD (+1 or +2 days)
  const handleExtendEdd = async (ticket: Ticket, daysToAdd: number) => {
    setReschedulingId(ticket.id);
    try {
      const baseDate = ticket.estimatedDeliveryDate
        ? new Date(ticket.estimatedDeliveryDate)
        : new Date();
      // If baseDate is in the past, add to today
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = baseDate < now ? now : baseDate;
      const newDate = new Date(start);
      newDate.setDate(newDate.getDate() + daysToAdd);
      const eddString = newDate.toISOString().slice(0, 10);

      await api(`/tickets/${ticket.id}`, {
        method: "PUT",
        body: JSON.stringify({
          estimatedDeliveryDate: eddString,
        }),
      });

      setSuccessToast(`Rescheduled to ${formatDate(eddString)}`);
      setTimeout(() => setSuccessToast(""), 3500);
      onTicketUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reschedule delivery date");
    } finally {
      setReschedulingId(null);
    }
  };

  // Instant Deliver & Print
  const handleInstantDeliver = async (ticket: Ticket) => {
    if (Number(ticket.balanceAmount || 0) > 0) {
      alert(`Cannot deliver with pending balance of ${formatCurrency(ticket.balanceAmount)}. Record payment first.`);
      return;
    }
    setDeliveringId(ticket.id);
    try {
      await api(`/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "DELIVERED",
          remarks: "Counter pickup — Instant Deliver",
        }),
      });

      // Open PDF receipt or download safely on mobile
      try {
        await printTicketReceipt(ticket.id);
      } catch (printErr) {
        console.warn("Could not auto-open receipt:", printErr);
      }

      setSuccessToast(`Delivered ${ticket.trackingNumber}! Receipt downloaded.`);
      setTimeout(() => setSuccessToast(""), 3500);
      onTicketUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as delivered");
    } finally {
      setDeliveringId(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!metric) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-start sm:flex-row sm:justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity duration-250 ease-out animate-fade-in"
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drilldown-drawer-title"
        className="relative flex h-[88vh] max-h-[90vh] w-full flex-col rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl sm:h-full sm:max-h-full sm:w-full sm:max-w-xl md:max-w-2xl sm:rounded-none sm:border-t-0 sm:border-l sm:border-slate-200 animate-in slide-in-from-bottom sm:slide-in-from-right duration-250 ease-out"
      >
        {/* Mobile pull grab handle */}
        <div className="mx-auto mt-2.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden" />

        {/* Toast Alert */}
        {successToast && (
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-bounce">
            {successToast}
          </div>
        )}

        {/* Drawer Header */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                {metric === "revenueToday" && <IndianRupee className="h-4 w-4" />}
                {metric === "activeRepairs" && <Wrench className="h-4 w-4" />}
                {metric === "readyPickup" && <PackageCheck className="h-4 w-4" />}
                {metric === "receivedToday" && <Package className="h-4 w-4" />}
                {metric === "deliveredToday" && <Truck className="h-4 w-4" />}
                {metric === "deliveredAll" && <PackageCheck className="h-4 w-4" />}
                {metric === "waitingParts" && <Clock className="h-4 w-4" />}
                {metric === "overdue" && <AlertTriangle className="h-4 w-4" />}
              </span>
              <div>
                <h2 id="drilldown-drawer-title" className="text-lg font-bold text-slate-900">
                  {metric === "revenueToday" && "Revenue Today Breakdown"}
                  {metric === "activeRepairs" && `Active Repairs (${filteredTickets.length})`}
                  {metric === "readyPickup" && `Ready for Pickup (${filteredTickets.length})`}
                  {metric === "receivedToday" && `Received Today (${filteredTickets.length})`}
                  {metric === "deliveredToday" && `Delivered Today (${filteredTickets.length})`}
                  {metric === "deliveredAll" && `All Delivered Tickets (${filteredTickets.length})`}
                  {metric === "waitingParts" && `Waiting for Parts (${filteredTickets.length})`}
                  {metric === "overdue" && `Overdue Repairs (${filteredTickets.length})`}
                </h2>
                <p className="text-xs text-slate-500">Live operational records & insights</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metric Switcher Pills */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {METRIC_TABS.filter((tab) => !tab.adminOnly || role === "ADMIN").map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSearch("");
                  onSelectMetric(tab.key);
                }}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 font-medium transition-all",
                  metric === tab.key
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="border-b border-slate-100 bg-white px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by customer, phone, brand, model, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Smart Contextual Banner */}
          {metric === "revenueToday" && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">💵 Day-End Cash Drawer & Bank Reconciliation</p>
                  <p className="text-2xl font-black text-emerald-950">
                    {formatCurrency(Number(revenueSummary?.totalRevenue ?? 0))}
                  </p>
                </div>
                {revenueSummary && (
                  <a
                    href={buildWhatsAppDayEndSummaryUrl(
                      revenueSummary,
                      devicesReceivedToday,
                      devicesDeliveredToday
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share Closing on WhatsApp
                  </a>
                )}
              </div>

              {/* Mode Breakdown */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/80 p-2 border border-emerald-100">
                  <p className="text-slate-500">Cash in Drawer</p>
                  <p className="font-bold text-slate-900">{formatCurrency(Number(revenueSummary?.cashTotal ?? 0))}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-2 border border-emerald-100">
                  <p className="text-slate-500">UPI / Bank</p>
                  <p className="font-bold text-blue-700">{formatCurrency(Number(revenueSummary?.upiTotal ?? 0))}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-2 border border-emerald-100">
                  <p className="text-slate-500">Card Swipes</p>
                  <p className="font-bold text-purple-700">{formatCurrency(Number(revenueSummary?.cardTotal ?? 0))}</p>
                </div>
              </div>
            </div>
          )}

          {metric === "activeRepairs" && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
              <div className="flex items-center justify-between">
                <span className="font-semibold">💡 Bench Insights:</span>
                <span className="text-slate-600">
                  {filteredTickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status)).length > 0 ? (
                    <span className="font-bold text-red-600">
                      ⚠️ {filteredTickets.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status)).length} Overdue
                    </span>
                  ) : (
                    "✅ All repairs within promised EDD"
                  )}
                </span>
              </div>
            </div>
          )}

          {metric === "readyPickup" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
              <p className="font-semibold">✨ Collection Ready:</p>
              <p className="text-emerald-700 mt-0.5">
                All repairs here have been verified. Tap WhatsApp to notify customer, or click &quot;Instant Deliver&quot; when they arrive!
              </p>
            </div>
          )}

          {/* Revenue Breakdown Itemized Transactions */}
          {metric === "revenueToday" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Today&apos;s Billed Transactions ({revenueSummary?.payments.length ?? 0})
              </h3>
              {loadingRevenue ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : revenueSummary?.payments.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No payment transactions recorded today yet.</p>
              ) : (
                revenueSummary?.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tickets/view?id=${p.ticketId}`}
                          className="font-bold text-blue-600 hover:underline text-xs"
                        >
                          {p.trackingNumber}
                        </Link>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {p.paymentMode}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 mt-0.5">
                        {p.customerName} · <span className="text-slate-500">{p.brand} {p.model}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Collected by {p.recordedByName} {p.notes ? `(${p.notes})` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">{formatCurrency(Number(p.amount))}</p>
                      {Number(p.balanceAmount || 0) > 0 ? (
                        <span className="text-[10px] font-semibold text-amber-600">
                          Bal: {formatCurrency(Number(p.balanceAmount))}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600">Settled ✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tickets List for all other operational metrics */}
          {metric !== "revenueToday" && (
            <div className="space-y-3">
              {filteredTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm font-semibold">No tickets match this view</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your search filter</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const vip = getVipStatus(customerRepairCounts.get(ticket.customer?.id) || 1);
                  const warranty = getWarrantyStatus(ticket);
                  const overdue = isOverdue(ticket.estimatedDeliveryDate, ticket.status);
                  const isSettled = Number(ticket.balanceAmount || 0) <= 0;

                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        "rounded-2xl border p-4 shadow-xs transition-all bg-white space-y-3",
                        overdue ? "border-red-200 bg-red-50/10" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {/* Top Row: Tracking, Status, VIP, Warranty */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/tickets/view?id=${ticket.id}`}
                            className="font-bold text-blue-600 hover:underline text-xs"
                          >
                            {ticket.trackingNumber}
                          </Link>
                          <Badge
                            variant={
                              ticket.status === "DELIVERED"
                                ? "success"
                                : ticket.status === "READY_FOR_PICKUP"
                                ? "warning"
                                : "default"
                            }
                            className="text-[10px]"
                          >
                            {formatStatus(ticket.status)}
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive" className="text-[10px] animate-pulse">
                              Overdue
                            </Badge>
                          )}
                          {vip.isRepeat && (
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] border", vip.badgeClass)}>
                              {vip.label}
                            </span>
                          )}
                        </div>
                        {warranty.status !== "NONE" && (
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full",
                              warranty.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : warranty.status === "EXPIRED"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {warranty.label}
                          </span>
                        )}
                      </div>

                      {/* Device & Customer */}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {ticket.brand} {ticket.model} {ticket.color ? `· ${ticket.color}` : ""}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5 flex-wrap">
                          <span className="font-medium text-slate-800">{ticket.customer?.fullName}</span>
                          <span>•</span>
                          <a
                            href={`tel:${ticket.customer?.mobile}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {ticket.customer?.mobile}
                          </a>
                        </div>
                        {ticket.problemDescription && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                            &quot;{ticket.problemDescription}&quot;
                          </p>
                        )}
                      </div>

                      {/* Financials & Technician */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-slate-400">Total: </span>
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(ticket.estimatedCost)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Bal: </span>
                            <span
                              className={cn(
                                "font-bold",
                                isSettled ? "text-emerald-600" : "text-amber-700"
                              )}
                            >
                              {formatCurrency(ticket.balanceAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-500">
                          {ticket.assignedTechnicianName ? (
                            <span>Tech: <strong className="text-slate-700">{ticket.assignedTechnicianName}</strong></span>
                          ) : (
                            <span className="text-amber-600 font-medium">Unassigned</span>
                          )}
                          {ticket.estimatedDeliveryDate && (
                            <p className={cn("text-[10px]", overdue ? "text-red-600 font-bold" : "text-slate-400")}>
                              EDD: {formatDate(ticket.estimatedDeliveryDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                        {/* WhatsApp Shortcuts */}
                        <div className="flex items-center gap-1.5">
                          {ticket.status === "READY_FOR_PICKUP" && (
                            <a
                              href={buildWhatsAppPickupUrl(ticket)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Pickup
                            </a>
                          )}

                          {ticket.status !== "DELIVERED" && ticket.status !== "READY_FOR_PICKUP" && (
                            <a
                              href={buildWhatsAppDelayUrl(ticket)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> Notify Customer
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={printingTicketId === ticket.id}
                            onClick={() => handlePrintTicket(ticket)}
                            aria-label="Print receipt PDF"
                            title="Print receipt PDF"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            {printingTicketId === ticket.id ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                            ) : (
                              <Printer className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Power Operations */}
                        <div className="flex items-center gap-1.5">
                          {/* 1-Click Extend Delivery Date (Active/Overdue) */}
                          {ticket.status !== "DELIVERED" && ticket.status !== "RETURNED_UNREPAIRED" && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={reschedulingId === ticket.id}
                                onClick={() => handleExtendEdd(ticket, 1)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
                              >
                                +1d EDD
                              </button>
                              <button
                                type="button"
                                disabled={reschedulingId === ticket.id}
                                onClick={() => handleExtendEdd(ticket, 2)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
                              >
                                +2d
                              </button>
                            </div>
                          )}

                          {/* Instant Deliver & Print button */}
                          {ticket.status === "READY_FOR_PICKUP" && (
                            <Button
                              size="sm"
                              disabled={deliveringId === ticket.id}
                              onClick={() => handleInstantDeliver(ticket)}
                              className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                            >
                              <Zap className="h-3 w-3" /> Instant Deliver
                            </Button>
                          )}

                          {/* View details */}
                          <Link href={`/tickets/view?id=${ticket.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
