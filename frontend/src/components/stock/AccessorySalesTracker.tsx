"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Search,
  X,
  Printer,
  Download,
  MessageCircle,
  Phone,
  Calendar,
  Clock,
  Tag,
  Plus,
  Loader2,
  RefreshCw,
  ExternalLink,
  Receipt,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { AccessorySale } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { printAccessoryWarrantyBill, downloadAccessoryWarrantyBill } from "@/lib/print";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuthGuard } from "@/hooks/useAuth";
import { useStore } from "@/context/StoreContext";

interface AccessorySalesTrackerProps {
  onOpenSellModal?: () => void;
  refreshTrigger?: number;
}

type WarrantyFilter = "ALL" | "ACTIVE" | "EXPIRED" | "NO_WARRANTY";

interface WarrantyStatusInfo {
  type: "ACTIVE" | "EXPIRED" | "NO_WARRANTY";
  label: string;
  subLabel: string;
  badgeClass: string;
  icon: typeof ShieldCheck;
  daysRemaining?: number;
}

export function computeWarrantyStatus(sale: AccessorySale): WarrantyStatusInfo {
  if (sale.status === "CANCELLED") {
    return {
      type: "EXPIRED",
      label: "Voided / Cancelled",
      subLabel: sale.cancellationReason || "Sale voided by Admin",
      badgeClass: "bg-[#FCE8E6] text-[#C5221F] border-[#F5C2C7]",
      icon: ShieldAlert,
    };
  }

  if (!sale.warrantyMonths || sale.warrantyMonths <= 0 || !sale.warrantyExpiresAt) {
    return {
      type: "NO_WARRANTY",
      label: "No Warranty",
      subLabel: "Standard counter sale",
      badgeClass: "bg-[#F7F7F8] text-[#767676] border-[#EBEBEB]",
      icon: Shield,
    };
  }

  // Parse YYYY-MM-DD
  const expiry = new Date(sale.warrantyExpiresAt + "T23:59:59");
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedExpiry = expiry.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (diffDays >= 0) {
    return {
      type: "ACTIVE",
      label: `In Warranty (${diffDays}d left)`,
      subLabel: `Valid till ${formattedExpiry}`,
      badgeClass: "bg-[#E6F4EA] text-[#0E8345] border-[#B8E3C8]",
      icon: ShieldCheck,
      daysRemaining: diffDays,
    };
  }

  const daysAgo = Math.abs(diffDays);
  return {
    type: "EXPIRED",
    label: "Warranty Expired",
    subLabel: `Expired on ${formattedExpiry} (${daysAgo}d ago)`,
    badgeClass: "bg-[#FCE8E6] text-[#C5221F] border-[#F5C2C7]",
    icon: ShieldAlert,
    daysRemaining: diffDays,
  };
}

export function AccessorySalesTracker({ onOpenSellModal, refreshTrigger }: AccessorySalesTrackerProps) {
  const { user } = useAuthGuard();
  const { activeStoreId } = useStore();
  const isAdmin = user?.role === "ADMIN";

  const [sales, setSales] = useState<AccessorySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filter, setFilter] = useState<WarrantyFilter>("ALL");

  const [selectedSale, setSelectedSale] = useState<AccessorySale | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadSales = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (activeStoreId && activeStoreId !== "ALL") params.set("storeId", activeStoreId);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const endpoint = `/accessory-sales${qs}`;
      const res = await api<AccessorySale[]>(endpoint);
      setSales(res || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load accessory sales");
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    loadSales(debouncedSearch);
  }, [debouncedSearch, loadSales, refreshTrigger, activeStoreId]);

  // Client-side filter
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (filter === "ALL") return true;
      const status = computeWarrantyStatus(sale);
      return status.type === filter;
    });
  }, [sales, filter]);

  // Statistics
  const stats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let noWarranty = 0;
    sales.forEach((s) => {
      const st = computeWarrantyStatus(s);
      if (st.type === "ACTIVE") active++;
      else if (st.type === "EXPIRED") expired++;
      else noWarranty++;
    });
    return { total: sales.length, active, expired, noWarranty };
  }, [sales]);

  const handlePrint = async (sale: AccessorySale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoadingId(`print-${sale.id}`);
    try {
      await printAccessoryWarrantyBill(sale.id, sale.billNumber);
    } catch (err: any) {
      alert("Failed to print bill: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = async (sale: AccessorySale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoadingId(`download-${sale.id}`);
    try {
      await downloadAccessoryWarrantyBill(sale.id, sale.billNumber);
    } catch (err: any) {
      alert("Failed to download bill: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWhatsApp = (sale: AccessorySale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const clean = (sale.customerMobile || "").replace(/\D/g, "");
    if (clean.length < 10) {
      alert("No valid 10-digit customer mobile on record.");
      return;
    }
    const phone = clean.length === 10 ? `91${clean}` : clean;
    const isWarranty = sale.warrantyMonths > 0;
    const header = isWarranty
      ? "*Famous Mobiles - Official Warranty Bill*"
      : "*Famous Mobiles - Sale Receipt*";

    let warrantyLine = "";
    if (isWarranty && sale.warrantyExpiresAt) {
      const d = new Date(sale.warrantyExpiresAt + "T00:00:00");
      const formattedExpiry = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : sale.warrantyExpiresAt;
      warrantyLine = `\n*Warranty:* ${sale.warrantyMonths} Months (Valid till ${formattedExpiry})`;
    }

    const serialLine = sale.serialNumber ? `\n*Serial/IMEI:* ${sale.serialNumber}` : "";
    const msg = `${header}\n\nHello ${sale.customerName},\nThank you for purchasing at *Famous Mobiles*!\n\n📋 *Bill No:* ${sale.billNumber}\n*Item:* ${sale.accessoryName}\n*Amount Paid:* ${formatCurrency(sale.price)} (${sale.paymentMode})${warrantyLine}${serialLine}\n\n📍 *Famous Mobiles*\nOpp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.\n📞 Store Contact: +91 90637 86751`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleVoidSale = async (sale: AccessorySale, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;
    const confirmMsg = `Are you sure you want to void / cancel bill ${sale.billNumber} (${formatCurrency(sale.price)})?\n\nThis will deduct the amount from today's revenue and cash drawer.`;
    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt("Reason for voiding / cancelling this sale:", "Customer returned item / mistaken entry");
    if (!reason || !reason.trim()) return;

    setActionLoadingId(`void-${sale.id}`);
    try {
      await api(`/accessory-sales/${sale.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await loadSales(searchQuery);
      if (selectedSale?.id === sale.id) {
        setSelectedSale(null);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to void accessory sale");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Quick Stats, & Sell Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#767676]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Track warranty by Bill No (FM-ACC-...), Mobile, Item, Serial..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-[10px] border border-[#EBEBEB] bg-white text-[#121212] placeholder-[#767676] focus:border-[#121212] focus:outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#767676] hover:text-[#121212] p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sell Accessory CTA */}
        {onOpenSellModal && (
          <button
            type="button"
            onClick={onOpenSellModal}
            className="flex items-center justify-center gap-1.5 rounded-[10px] bg-[#121212] hover:bg-black text-white px-3.5 py-2 text-xs font-bold shadow-xs active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Sell Accessory & Bill</span>
          </button>
        )}
      </div>

      {/* Filter Tabs Strip */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EBEBEB] pb-2">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
            filter === "ALL"
              ? "bg-[#121212] text-white border-[#121212]"
              : "bg-white text-[#767676] border-[#EBEBEB] hover:bg-[#F7F7F8] hover:text-[#121212]"
          )}
        >
          All Sales ({stats.total})
        </button>

        <button
          type="button"
          onClick={() => setFilter("ACTIVE")}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
            filter === "ACTIVE"
              ? "bg-[#0E8345] text-white border-[#0E8345]"
              : "bg-white text-[#0E8345] border-[#EBEBEB] hover:bg-[#E6F4EA]"
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>In Warranty ({stats.active})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("EXPIRED")}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5",
            filter === "EXPIRED"
              ? "bg-[#C5221F] text-white border-[#C5221F]"
              : "bg-white text-[#C5221F] border-[#EBEBEB] hover:bg-[#FCE8E6]"
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Expired ({stats.expired})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("NO_WARRANTY")}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
            filter === "NO_WARRANTY"
              ? "bg-[#767676] text-white border-[#767676]"
              : "bg-white text-[#767676] border-[#EBEBEB] hover:bg-[#F7F7F8]"
          )}
        >
          No Warranty ({stats.noWarranty})
        </button>

        <button
          type="button"
          onClick={() => loadSales(searchQuery)}
          disabled={loading}
          className="ml-auto rounded-[8px] p-1.5 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors cursor-pointer"
          title="Refresh sales list"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-[10px] bg-[#FCE8E6] border border-[#F5C2C7] p-3 text-xs text-[#C5221F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadSales(searchQuery)}
            className="font-bold underline cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && sales.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#121212] mb-2" />
          <p className="text-xs text-[#767676]">Loading sold accessories and warranties...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredSales.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-[#EBEBEB] bg-[#FDFDFD] p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-[#A0A0A0] mb-2" />
          <p className="text-xs font-bold text-[#121212]">No accessory sales found</p>
          <p className="text-[11px] text-[#767676] mt-0.5">
            {searchQuery
              ? `No matches for "${searchQuery}". Try searching by customer phone number or item name.`
              : "No accessory sales recorded under this filter yet."}
          </p>
          {onOpenSellModal && (
            <button
              type="button"
              onClick={onOpenSellModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#121212] px-3 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record First Accessory Sale</span>
            </button>
          )}
        </div>
      )}

      {/* Sales List */}
      <div className="space-y-2.5">
        {filteredSales.map((sale) => {
          const status = computeWarrantyStatus(sale);
          const StatusIcon = status.icon;

          return (
            <div
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className="group relative rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 sm:p-4 hover:border-[#121212] hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Left: Item, Bill No, Serial & Customer */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#121212] tracking-wide">
                      {sale.billNumber}
                    </span>
                    <span className="text-[11px] text-[#A0A0A0]">•</span>
                    <span className="text-[11px] text-[#767676]">
                      {formatDate(sale.soldAt || sale.createdAt)}
                    </span>
                    {sale.soldByName && (
                      <span className="hidden sm:inline text-[10.5px] text-[#767676] bg-[#F7F7F8] px-1.5 py-0.5 rounded-[4px] border border-[#EBEBEB]">
                        Sold by {sale.soldByName}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#121212] mt-1 leading-snug">
                    {sale.accessoryName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#767676]">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-[#121212]" />
                      <span className="font-semibold text-[#121212]">{sale.customerName}</span>
                      {sale.customerMobile && sale.customerMobile !== "0000000000" && (
                        <span className="font-mono text-[#767676]">({sale.customerMobile})</span>
                      )}
                    </div>

                    {sale.serialNumber && (
                      <div className="flex items-center gap-1 font-mono text-[10.5px] bg-[#F7F7F8] px-1.5 py-0.5 rounded-[4px] border border-[#EBEBEB] text-[#121212]">
                        <Tag className="h-2.5 w-2.5" />
                        <span>SN: {sale.serialNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Price & Live Warranty Badge & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#F7F7F8]">
                  {/* Price & Mode */}
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-extrabold text-[#121212]">
                      {formatCurrency(sale.price)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[#767676]">
                      {sale.paymentMode || "UPI"} • PAID ✓
                    </div>
                  </div>

                  {/* Warranty Status Pill */}
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-xs font-bold leading-none shrink-0",
                      status.badgeClass
                    )}
                    title={status.subLabel}
                  >
                    <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{status.label}</span>
                  </div>

                  {/* Quick Action Icons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {sale.customerMobile && sale.customerMobile.length >= 10 && (
                      <button
                        type="button"
                        onClick={(e) => handleWhatsApp(sale, e)}
                        className="rounded-[6px] p-1.5 text-[#075E54] hover:bg-[#25D366]/15 transition-colors cursor-pointer"
                        title="Send bill on WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 text-[#25D366]" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionLoadingId === `download-${sale.id}`}
                      onClick={(e) => handleDownload(sale, e)}
                      className="rounded-[6px] p-1.5 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors cursor-pointer"
                      title="Download PDF Bill"
                    >
                      {actionLoadingId === `download-${sale.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#121212]" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoadingId === `print-${sale.id}`}
                      onClick={(e) => handlePrint(sale, e)}
                      className="rounded-[6px] p-1.5 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors cursor-pointer"
                      title="Print Bill"
                    >
                      {actionLoadingId === `print-${sale.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#121212]" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                    </button>

                    {isAdmin && sale.status !== "CANCELLED" && (
                      <button
                        type="button"
                        disabled={actionLoadingId === `void-${sale.id}`}
                        onClick={(e) => handleVoidSale(sale, e)}
                        className="rounded-[6px] px-2 py-1 text-[10.5px] font-bold text-[#C5221F] bg-[#FCE8E6] border border-[#F5C2C7] hover:bg-[#F8D7DA] transition-colors cursor-pointer ml-1"
                        title="Void / Cancel this bill"
                      >
                        {actionLoadingId === `void-${sale.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Void"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sale / Warranty Details Modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="w-full max-w-md rounded-[14px] bg-white border border-[#EBEBEB] shadow-2xl p-5 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#121212]" />
                <div>
                  <h3 className="text-sm font-bold text-[#121212]">
                    Accessory Sale & Warranty Details
                  </h3>
                  <p className="font-mono text-[11px] text-[#767676]">
                    {selectedSale.billNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="rounded-[6px] p-1 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Warranty Status Banner */}
            {(() => {
              const status = computeWarrantyStatus(selectedSale);
              const Icon = status.icon;
              return (
                <div className={cn("rounded-[10px] border p-3 mb-4 flex items-start gap-2.5", status.badgeClass)}>
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{status.label}</h4>
                    <p className="text-[11px] mt-0.5 opacity-90">{status.subLabel}</p>
                  </div>
                </div>
              );
            })()}

            {/* Details Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                <span className="text-[#767676]">Item Name:</span>
                <span className="font-bold text-[#121212] text-right">{selectedSale.accessoryName}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                <span className="text-[#767676]">Amount Paid:</span>
                <span className="font-bold text-[#121212]">
                  {formatCurrency(selectedSale.price)} ({selectedSale.paymentMode})
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                <span className="text-[#767676]">Customer:</span>
                <span className="font-medium text-[#121212]">
                  {selectedSale.customerName} ({selectedSale.customerMobile})
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                <span className="text-[#767676]">Purchase Date:</span>
                <span className="font-medium text-[#121212]">{formatDate(selectedSale.soldAt)}</span>
              </div>

              {selectedSale.warrantyMonths > 0 && (
                <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                  <span className="text-[#767676]">Warranty Duration:</span>
                  <span className="font-bold text-[#0E8345]">
                    {selectedSale.warrantyMonths} Months (Valid till {formatDate(selectedSale.warrantyExpiresAt)})
                  </span>
                </div>
              )}

              {selectedSale.serialNumber && (
                <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                  <span className="text-[#767676]">Serial / IMEI / Batch:</span>
                  <span className="font-mono font-medium text-[#121212]">{selectedSale.serialNumber}</span>
                </div>
              )}

              {selectedSale.soldByName && (
                <div className="flex items-center justify-between border-b border-[#F7F7F8] pb-1.5">
                  <span className="text-[#767676]">Sold By:</span>
                  <span className="font-medium text-[#121212]">{selectedSale.soldByName}</span>
                </div>
              )}

              {selectedSale.notes && (
                <div className="pt-1">
                  <span className="text-[#767676] block mb-0.5">Notes:</span>
                  <p className="rounded-[6px] bg-[#F7F7F8] p-2 text-[11px] text-[#121212] border border-[#EBEBEB]">
                    {selectedSale.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-5 pt-3 border-t border-[#EBEBEB]">
              {isAdmin && selectedSale.status !== "CANCELLED" ? (
                <button
                  type="button"
                  disabled={actionLoadingId === `void-${selectedSale.id}`}
                  onClick={(e) => handleVoidSale(selectedSale, e)}
                  className="flex items-center gap-1 rounded-[8px] border border-[#F5C2C7] bg-[#FCE8E6] px-3 py-1.5 text-xs font-semibold text-[#C5221F] hover:bg-[#F8D7DA] transition-all cursor-pointer"
                >
                  {actionLoadingId === `void-${selectedSale.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>Void Sale</span>
                  )}
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleWhatsApp(selectedSale)}
                  className="flex items-center gap-1 rounded-[8px] border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#075E54] hover:bg-[#25D366]/20 transition-all cursor-pointer"
                  title="Share via WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(selectedSale)}
                  className="flex items-center gap-1 rounded-[8px] border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-semibold text-[#121212] hover:bg-[#F7F7F8] transition-all cursor-pointer"
                  title="Download PDF bill"
                >
                  <Download className="h-3.5 w-3.5 text-[#767676]" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoadingId !== null}
                  onClick={() => handlePrint(selectedSale)}
                  className="flex items-center gap-1.5 rounded-[8px] bg-[#121212] text-white px-3.5 py-1.5 text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-xs active:scale-98"
                  title="Print customer bill"
                >
                  <Printer className="h-3.5 w-3.5 text-[#0E8345]" />
                  <span>Print Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
