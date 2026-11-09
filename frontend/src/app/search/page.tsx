"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Phone,
  MessageCircle,
  ChevronRight,
  MapPin,
  Tag,
  Smartphone,
  User,
  SearchX,
  Plus,
  Wrench,
  Users,
  LayoutGrid,
  Download,
  Printer,
} from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageLoading } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { Customer, Ticket, AccessorySale } from "@/lib/types";
import { formatStatus, formatCustomerMobiles, formatCurrency } from "@/lib/utils";
import { useStore } from "@/context/StoreContext";
import { cn } from "@/lib/utils";
import { computeWarrantyStatus } from "@/components/stock/AccessorySalesTracker";
import { printAccessoryWarrantyBill, downloadAccessoryWarrantyBill } from "@/lib/print";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface SearchResult {
  tickets: Ticket[];
  customers: Customer[];
}

function getCustomerInitials(name: string): string {
  if (!name) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP") return "warning";
  if (status === "RETURNED_UNREPAIRED") return "destructive";
  return "default";
}

function formatCompactStatus(status: string): string {
  switch (status) {
    case "DEVICE_RECEIVED":
      return "Received";
    case "IN_PROGRESS":
    case "REPAIR_IN_PROGRESS":
      return "In Progress";
    case "UNDER_DIAGNOSIS":
      return "Diagnosing";
    case "QUALITY_CHECK":
      return "Quality Check";
    case "READY_FOR_PICKUP":
      return "Ready";
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

const QUICK_EXAMPLES = [
  { label: "Ticket Token", prefix: "FM1-" },
  { label: "Samsung", prefix: "Samsung" },
  { label: "iPhone", prefix: "iPhone" },
  { label: "vivo", prefix: "vivo" },
  { label: "Screen Issue", prefix: "Screen" },
  { label: "Charging", prefix: "Charging" },
];

export default function SearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthGuard();
  const { activeStoreId } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [accessories, setAccessories] = useState<AccessorySale[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"ALL" | "TICKETS" | "CUSTOMERS" | "ACCESSORIES">("ALL");

  useEffect(() => {
    if (authLoading || !user) return;
    if (debouncedQuery.trim().length < 2) {
      setResults(null);
      setAccessories([]);
      setError("");
      return;
    }
    setSearching(true);
    setError("");
    const storeParam = activeStoreId !== "ALL" ? `&storeId=${activeStoreId}` : "";
    Promise.all([
      api<SearchResult>(`/search?q=${encodeURIComponent(debouncedQuery.trim())}${storeParam}`),
      api<AccessorySale[]>(`/accessory-sales?q=${encodeURIComponent(debouncedQuery.trim())}`).catch(() => [] as AccessorySale[]),
    ])
      .then(([searchRes, accRes]) => {
        setResults(searchRes);
        setAccessories(accRes || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Search failed"))
      .finally(() => setSearching(false));
  }, [debouncedQuery, authLoading, user, activeStoreId]);

  if (authLoading) return <PageLoading />;

  const hasResults = results !== null;
  const ticketsList = results?.tickets || [];
  const customersList = results?.customers || [];
  const accessoriesList = accessories || [];
  const totalCount = ticketsList.length + customersList.length + accessoriesList.length;
  const isEmpty = hasResults && totalCount === 0;

  const showTickets = (scope === "ALL" || scope === "TICKETS") && ticketsList.length > 0;
  const showCustomers = (scope === "ALL" || scope === "CUSTOMERS") && customersList.length > 0;
  const showAccessories = (scope === "ALL" || scope === "ACCESSORIES") && accessoriesList.length > 0;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 animate-fade-in text-[#121212]">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">Search</h1>
            <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
              Instant search across repair tickets, customers, phone numbers, IMEI, and devices
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tickets/new">
              <Button variant="primary" size="sm" className="cursor-pointer gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span>New Repair</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Polished Inset Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#767676] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by ticket token, customer name, mobile, IMEI, model..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search records"
            autoFocus
            className="h-11 w-full rounded-[10px] border border-[#EBEBEB] bg-white pl-10 pr-20 text-xs text-[#121212] placeholder-[#767676] focus:border-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] shadow-2xs transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searching && (
              <Loader2 className="h-4 w-4 animate-spin text-[#767676]" />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded-full p-1 text-[#767676] hover:text-[#121212] cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Scope Chips (Shown when searching or results exist) */}
        {hasResults && !isEmpty && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setScope("ALL")}
              className={cn(
                "h-8 px-3 rounded-[8px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                scope === "ALL"
                  ? "bg-[#121212] text-white shadow-2xs font-semibold"
                  : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
              )}
            >
              <span>All Results</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                scope === "ALL" ? "bg-white/20 text-white" : "bg-[#E0E0E2] text-[#121212]"
              )}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScope("TICKETS")}
              className={cn(
                "h-8 px-3 rounded-[8px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                scope === "TICKETS"
                  ? "bg-[#121212] text-white shadow-2xs font-semibold"
                  : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
              )}
            >
              <span>Tickets</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                scope === "TICKETS" ? "bg-white/20 text-white" : "bg-[#E0E0E2] text-[#121212]"
              )}>
                {ticketsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScope("CUSTOMERS")}
              className={cn(
                "h-8 px-3 rounded-[8px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                scope === "CUSTOMERS"
                  ? "bg-[#121212] text-white shadow-2xs font-semibold"
                  : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
              )}
            >
              <span>Customers</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                scope === "CUSTOMERS" ? "bg-white/20 text-white" : "bg-[#E0E0E2] text-[#121212]"
              )}>
                {customersList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScope("ACCESSORIES")}
              className={cn(
                "h-8 px-3 rounded-[8px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                scope === "ACCESSORIES"
                  ? "bg-[#121212] text-white shadow-2xs font-semibold"
                  : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#0E8345]" />
              <span>Accessory Warranty</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                scope === "ACCESSORIES" ? "bg-white/20 text-white" : "bg-[#E0E0E2] text-[#121212]"
              )}>
                {accessoriesList.length}
              </span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && <Alert variant="error">{error}</Alert>}

        {/* Empty / Initial State (When query < 2 chars) */}
        {!hasResults && !searching && query.trim().length < 2 && (
          <div className="space-y-4 pt-1">
            {/* Quick Keyword Suggestions */}
            <div>
              <p className="text-[12px] font-semibold text-[#767676] mb-2 uppercase tracking-wider">
                Quick Search Suggestions
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_EXAMPLES.map((item) => (
                  <button
                    key={item.prefix}
                    type="button"
                    onClick={() => {
                      setQuery(item.prefix);
                      inputRef.current?.focus();
                    }}
                    className="h-7 rounded-[6px] border border-[#EBEBEB] bg-white px-2.5 text-xs text-[#121212] hover:border-[#121212] hover:bg-[#F7F7F8] active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guided Help Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div
                onClick={() => {
                  setQuery("FM1-");
                  inputRef.current?.focus();
                }}
                className="group rounded-[12px] border border-[#EBEBEB] bg-white p-4 transition-all hover:border-[#121212]/40 hover:shadow-2xs cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] group-hover:bg-[#121212] group-hover:text-white transition-colors">
                  <Tag className="h-4 w-4" />
                </div>
                <h3 className="mt-3 font-bold text-sm text-[#121212]">Search by Ticket Token</h3>
                <p className="mt-1 text-xs text-[#767676] leading-relaxed">
                  Type tokens like <span className="font-mono font-semibold text-[#121212]">FM1-2026-000165</span> to immediately view repair status and history.
                </p>
              </div>

              <div
                onClick={() => inputRef.current?.focus()}
                className="group rounded-[12px] border border-[#EBEBEB] bg-white p-4 transition-all hover:border-[#121212]/40 hover:shadow-2xs cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] group-hover:bg-[#121212] group-hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <h3 className="mt-3 font-bold text-sm text-[#121212]">Search by Phone Number</h3>
                <p className="mt-1 text-xs text-[#767676] leading-relaxed">
                  Enter any 10-digit primary or alternate phone number to find matching repairs and customer accounts.
                </p>
              </div>

              <div
                onClick={() => inputRef.current?.focus()}
                className="group rounded-[12px] border border-[#EBEBEB] bg-white p-4 transition-all hover:border-[#121212]/40 hover:shadow-2xs cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] group-hover:bg-[#121212] group-hover:text-white transition-colors">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h3 className="mt-3 font-bold text-sm text-[#121212]">Search by Device or IMEI</h3>
                <p className="mt-1 text-xs text-[#767676] leading-relaxed">
                  Search by device model (e.g. <span className="font-semibold text-[#121212]">Samsung S23</span>, <span className="font-semibold text-[#121212]">OnePlus 11R</span>) or 15-digit IMEI.
                </p>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="pt-2 border-t border-[#EBEBEB] mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#767676]">
              <span>Need to manage full records?</span>
              <div className="flex items-center gap-3">
                <Link href="/tickets" className="font-semibold text-[#121212] hover:underline flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Repairs Board</span>
                </Link>
                <span>·</span>
                <Link href="/customers" className="font-semibold text-[#121212] hover:underline flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>Customer Directory</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* No Results Found State */}
        {isEmpty && !searching && (
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-8 text-center animate-fade-in shadow-2xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F0F2] text-[#767676]">
              <SearchX className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-sm font-bold text-[#121212]">
              No matches found for &quot;{debouncedQuery}&quot;
            </h2>
            <p className="mt-1 text-xs text-[#767676] max-w-md mx-auto">
              We couldn&apos;t find any tickets or customers matching that term. Double check spelling, try a 10-digit phone number, or search by ticket token.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer h-8 text-xs"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                Clear Search
              </Button>
              <Link href="/tickets/new">
                <Button variant="primary" size="sm" className="cursor-pointer h-8 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New Repair</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Results Sections */}
        {hasResults && !isEmpty && (
          <div className="space-y-6 animate-fade-in">
            {/* 1. TICKETS RESULTS */}
            {showTickets && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-[14px] font-bold text-[#121212] flex items-center gap-1.5">
                    <span>Tickets</span>
                    <span className="rounded-full bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-mono text-[#767676]">
                      {ticketsList.length}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {ticketsList.map((t) => {
                    const cleanMobile = (t.customer?.mobile || "").replace(/\D/g, "");
                    const waText = encodeURIComponent(
                      `Hi ${t.customer?.fullName || "Customer"}, regarding your repair (${t.trackingNumber}) at Famous Mobiles:`
                    );
                    const storeCode = t.store?.code || "FM1";

                    return (
                      <div
                        key={t.id}
                        onClick={() => router.push(`/tickets/view?id=${t.id}`)}
                        className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 transition-all hover:border-[#121212]/30 hover:shadow-2xs cursor-pointer min-h-[145px]"
                      >
                        {/* Top: Tracking Number & Store Pill & Status */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
                              <span className="font-mono font-bold text-xs text-[#121212] tracking-tight shrink-0">
                                {t.trackingNumber}
                              </span>
                              <span className="rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#121212] shrink-0">
                                {storeCode}
                              </span>
                            </div>

                            <Badge
                              variant={statusVariant(t.status)}
                              className="text-[10px] px-2 py-0.5 uppercase tracking-wide font-bold shrink-0 whitespace-nowrap"
                            >
                              {formatCompactStatus(t.status)}
                            </Badge>
                          </div>

                          {/* Device & Issue */}
                          <div className="mt-2 min-w-0">
                            <p
                              className="font-bold text-[14px] text-[#121212] truncate leading-tight"
                              title={`${t.brand || ""} ${t.model || ""}`.trim() || t.deviceType}
                            >
                              {`${t.brand || ""} ${t.model || ""}`.trim() || t.deviceType}
                              {t.color && (
                                <span className="ml-1.5 font-normal text-xs text-[#767676]">· {t.color}</span>
                              )}
                            </p>

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

                          {/* Customer & Actions */}
                          <div className="mt-2 flex items-center justify-between gap-2 pt-0.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-[#121212] truncate">
                                {t.customer?.fullName || "Unknown Customer"}
                              </p>
                              {cleanMobile && (
                                <p className="text-xs text-[#767676] font-mono">
                                  {t.customer?.mobile}
                                </p>
                              )}
                            </div>

                            {/* 1-Tap Call & WhatsApp */}
                            <div
                              className="flex items-center gap-1 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {cleanMobile && (
                                <>
                                  <a
                                    href={`tel:${cleanMobile}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                                    title={`Call ${t.customer?.fullName}`}
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
                                </>
                              )}
                              <div className="flex h-7 w-4 items-center justify-center text-[#767676] group-hover:text-[#121212] group-hover:translate-x-0.5 transition-transform">
                                <ChevronRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Date + Tech & Balance */}
                        <div className="mt-3 pt-2.5 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#767676]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-[#121212]/80 shrink-0">
                              {formatIntakeDate(t.createdAt)}
                            </span>
                            <span>·</span>
                            <span className="truncate max-w-[120px]" title={t.assignedTechnicianName ?? "Unassigned"}>
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
              </div>
            )}

            {/* 2. CUSTOMERS RESULTS */}
            {showCustomers && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-[14px] font-bold text-[#121212] flex items-center gap-1.5">
                    <span>Customers</span>
                    <span className="rounded-full bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-mono text-[#767676]">
                      {customersList.length}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {customersList.map((c) => {
                    const cleanMobile = c.mobile?.replace(/\D/g, "") || "";
                    const waText = encodeURIComponent(
                      `Hi ${c.fullName}, contacting you from Famous Mobiles:`
                    );
                    const initials = getCustomerInitials(c.fullName);
                    const validAddress =
                      c.address &&
                      c.address.trim().length >= 3 &&
                      c.address.trim().toLowerCase() !== "www"
                        ? c.address.trim()
                        : null;

                    return (
                      <div
                        key={c.id}
                        onClick={() => router.push(`/customers/view?id=${c.id}`)}
                        className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 transition-all hover:border-[#121212]/30 hover:shadow-2xs cursor-pointer min-h-[115px]"
                      >
                        <div className="flex items-start gap-3">
                          {/* Monogram Avatar */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0F0F2] font-bold text-xs text-[#121212] border border-[#EBEBEB]">
                            {initials}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-[14px] text-[#121212] truncate leading-tight">
                                {c.fullName}
                              </p>
                              <span className="shrink-0 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#121212]">
                                {c.customerCode}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-[#767676] font-medium">
                              {formatCustomerMobiles(c)}
                            </p>

                            {validAddress && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-[#767676] truncate" title={validAddress}>
                                <MapPin className="h-3 w-3 shrink-0 text-[#767676]" />
                                <span className="truncate">{validAddress}</span>
                              </p>
                            )}
                          </div>

                          {/* 1-Tap Actions */}
                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cleanMobile && (
                              <>
                                <a
                                  href={`tel:${cleanMobile}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                                  title={`Call ${c.fullName}`}
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
                              </>
                            )}
                            <div className="flex h-8 w-5 items-center justify-center text-[#767676] group-hover:text-[#121212] group-hover:translate-x-0.5 transition-transform">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>

                        {/* Footer: View History Link */}
                        <div className="mt-2.5 pt-2 border-t border-[#EBEBEB] flex items-center justify-end text-[11px] text-[#767676]">
                          <span className="text-[11px] font-medium text-[#121212] group-hover:underline">
                            View Customer History →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ACCESSORY SALES & WARRANTY RESULTS */}
            {showAccessories && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-[14px] font-bold text-[#121212] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#0E8345]" />
                    <span>Accessory Sales & Warranties</span>
                    <span className="rounded-full bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-mono text-[#767676]">
                      {accessoriesList.length}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {accessoriesList.map((acc) => {
                    const status = computeWarrantyStatus(acc);
                    const StatusIcon = status.icon;
                    const cleanMobile = (acc.customerMobile || "").replace(/\D/g, "");

                    const handlePrint = async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      try {
                        await printAccessoryWarrantyBill(acc.id, acc.billNumber);
                      } catch (err: any) {
                        alert("Print failed: " + (err?.message || "Unknown error"));
                      }
                    };

                    const handleDownload = async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      try {
                        await downloadAccessoryWarrantyBill(acc.id, acc.billNumber);
                      } catch (err: any) {
                        alert("Download failed: " + (err?.message || "Unknown error"));
                      }
                    };

                    const handleWhatsApp = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (cleanMobile.length < 10) return;
                      const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                      const isW = acc.warrantyMonths > 0;
                      const header = isW
                        ? "*Famous Mobiles - Official Warranty Bill*"
                        : "*Famous Mobiles - Sale Receipt*";

                      let wLine = "";
                      if (isW && acc.warrantyExpiresAt) {
                        const d = new Date(acc.warrantyExpiresAt + "T00:00:00");
                        const fExp = !isNaN(d.getTime())
                          ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : acc.warrantyExpiresAt;
                        wLine = `\n*Warranty:* ${acc.warrantyMonths} Months (Valid till ${fExp})`;
                      }

                      const sLine = acc.serialNumber ? `\n*Serial/IMEI:* ${acc.serialNumber}` : "";
                      const msg = `${header}\n\nHello ${acc.customerName},\nThank you for purchasing at *Famous Mobiles*!\n\n📋 *Bill No:* ${acc.billNumber}\n*Item:* ${acc.accessoryName}\n*Amount Paid:* ${formatCurrency(acc.price)} (${acc.paymentMode})${wLine}${sLine}\n\n📍 *Famous Mobiles*\nOpp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.\n📞 Store Contact: +91 90637 86751`;
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                    };

                    return (
                      <div
                        key={acc.id}
                        onClick={() => router.push("/stock-orders")}
                        className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 transition-all hover:border-[#121212]/30 hover:shadow-2xs cursor-pointer min-h-[115px]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#121212]">
                              {acc.billNumber}
                            </span>
                            <div
                              className={cn(
                                "inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 text-[10.5px] font-bold leading-none shrink-0",
                                status.badgeClass
                              )}
                              title={status.subLabel}
                            >
                              <StatusIcon className="h-3 w-3 shrink-0" />
                              <span>{status.label}</span>
                            </div>
                          </div>

                          <h3 className="font-bold text-[14px] text-[#121212] mt-1.5 leading-snug">
                            {acc.accessoryName}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#767676] mt-1 font-medium">
                            <span className="text-[#121212] font-semibold">{acc.customerName}</span>
                            {cleanMobile.length >= 10 && (
                              <span className="font-mono text-[#767676]">({acc.customerMobile})</span>
                            )}
                            {acc.serialNumber && (
                              <span className="font-mono text-[10.5px] bg-[#F7F7F8] px-1.5 py-0.5 rounded border border-[#EBEBEB]">
                                SN: {acc.serialNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Footer: Price, Date & Actions */}
                        <div className="mt-3 pt-2.5 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#767676]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-[#121212]">
                              {formatCurrency(acc.price)}
                            </span>
                            <span className="text-[10px] text-[#767676] uppercase font-semibold">
                              ({acc.paymentMode || "UPI"})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {cleanMobile.length >= 10 && (
                              <button
                                type="button"
                                onClick={handleWhatsApp}
                                className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#EAF6EE] text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 transition-all"
                                title="Share on WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={handleDownload}
                              className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                              title="Download PDF Invoice"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={handlePrint}
                              className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#121212] text-white hover:bg-black active:scale-95 transition-all"
                              title="Print Bill"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
