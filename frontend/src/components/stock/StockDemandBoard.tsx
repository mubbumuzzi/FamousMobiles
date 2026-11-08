"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  Phone,
  MessageCircle,
  Trash2,
  Search,
  Check,
  Plus,
  Copy,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Store,
  AlertCircle,
} from "lucide-react";
import { api, getCachedApi } from "@/lib/api";
import { StockOrder, StockOrderStatus } from "@/lib/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { formatSupplierOrderList, sanitizeItemForSupplier } from "@/lib/supplier-list-sanitizer";

interface StockDemandBoardProps {
  onOpenNewStockOrder: () => void;
  refreshTrigger?: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 8;

const SUGGESTION_CATEGORIES = [
  { label: "All Items", key: "" },
  { label: "Display / Screen", key: "display", match: ["display", "combo", "screen", "folder", "lcd", "oled"] },
  { label: "Back Cover", key: "cover", match: ["cover", "back", "case", "panel", "body"] },
  { label: "Tempered Glass", key: "glass", match: ["glass", "tempered", "uv", "matte"] },
  { label: "Charging", key: "charg", match: ["charg", "cc", "port", "subboard", "connector", "cable"] },
  { label: "Battery", key: "battery", match: ["battery", "batt"] },
  { label: "Camera", key: "camera", match: ["camera", "lens", "cam"] },
];

function isExpiredArrived(arrivedAt?: string | null, createdAt?: string): boolean {
  const d = arrivedAt || createdAt;
  if (!d) return false;
  return Date.now() - new Date(d).getTime() > SEVEN_DAYS_MS;
}

function isExpiredFulfilled(fulfilledAt?: string | null, updatedAt?: string): boolean {
  const d = fulfilledAt || updatedAt;
  if (!d) return false;
  return Date.now() - new Date(d).getTime() > FOURTEEN_DAYS_MS;
}

function formatArrivalIndicator(arrivedAt?: string | null, createdAt?: string): string {
  const d = arrivedAt || createdAt;
  if (!d) return "Today";
  const diffMs = Date.now() - new Date(d).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays >= 5 && diffDays < 7) {
    return `${diffDays}d ago (${7 - diffDays}d left)`;
  }
  return `${diffDays}d ago`;
}

function parseAccessoryTags(itemText: string): string[] {
  if (!itemText) return [];
  const text = itemText.toLowerCase();
  const tags: string[] = [];
  if (text.includes("display") || text.includes("screen") || text.includes("combo") || text.includes("folder") || text.includes("lcd") || text.includes("oled")) {
    tags.push("Display / Screen");
  }
  if (text.includes("cover") || text.includes("case") || text.includes("back") || text.includes("panel")) {
    tags.push("Back Cover");
  }
  if (text.includes("glass") || text.includes("tempered") || text.includes("uv") || text.includes("matte")) {
    tags.push("Tempered Glass");
  }
  if (text.includes("charg") || text.includes("cable") || text.includes("port") || text.includes("subboard")) {
    tags.push("Charging");
  }
  if (text.includes("battery") || text.includes("batt")) {
    tags.push("Battery");
  }
  if (text.includes("camera") || text.includes("lens") || text.includes("cam")) {
    tags.push("Camera");
  }
  return tags;
}

function getWhatsAppUrl(order: StockOrder): string {
  if (!order.customerMobile) return "";
  const rawMobile = order.customerMobile.replace(/\D/g, "");
  const mobileWithCountry = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;
  const cleanItem = sanitizeItemForSupplier(order.itemDetails, order.customerName, order.customerMobile);

  let msg = "";
  if (order.status === "ARRIVED") {
    msg = `Hello ${order.customerName},\n\nYour requested item *${cleanItem}* has arrived and is ready for pickup at *Famous Mobiles*!\n\n📍 *Famous Mobiles*\nOpp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.\n📞 Contact: 9063786751`;
  } else {
    msg = `Hello ${order.customerName},\n\nRegarding your requested item *${cleanItem}* at *Famous Mobiles*: we have placed the order with our wholesale distributor. We will notify you as soon as it arrives for pickup!\n\n📞 Contact: 9063786751`;
  }
  return `https://wa.me/${mobileWithCountry}?text=${encodeURIComponent(msg)}`;
}

export function StockDemandBoard({ onOpenNewStockOrder, refreshTrigger = 0 }: StockDemandBoardProps) {
  const stockCacheKey = "/stock-orders?status=ALL";
  const [orders, setOrders] = useState<StockOrder[]>(
    () => getCachedApi<StockOrder[]>(stockCacheKey) ?? []
  );
  const [loading, setLoading] = useState(
    () => !getCachedApi<StockOrder[]>(stockCacheKey)
  );
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PENDING" | "ARRIVED" | "UNCLAIMED" | "FULFILLED">("ACTIVE");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedWholesale, setCopiedWholesale] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrders = async () => {
    try {
      if (!getCachedApi(stockCacheKey)) {
        setLoading(true);
      }
      const data = await api<StockOrder[]>(stockCacheKey);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load stock orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, refreshTrigger]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: StockOrderStatus) => {
    setActionInProgress(orderId);
    try {
      await api<StockOrder>(`/stock-orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (nextStatus === "ARRIVED") {
        showToast("Marked as arrived in store! Ready to notify customer.");
      } else if (nextStatus === "FULFILLED") {
        showToast("Order fulfilled & completed!");
      }
      fetchOrders();
    } catch (err: any) {
      alert(err?.message || "Failed to update order status");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel / remove this stock request?")) return;
    setActionInProgress(orderId);
    try {
      await api(`/stock-orders/${orderId}`, { method: "DELETE" });
      showToast("Order removed.");
      fetchOrders();
    } catch (err: any) {
      alert(err?.message || "Failed to delete order");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExportWholesale = () => {
    const pendingOrders = orders.filter((o) => o.status === "PENDING");
    if (pendingOrders.length === 0) {
      alert("No pending stock orders to export.");
      return;
    }

    const msg = formatSupplierOrderList(pendingOrders);

    navigator.clipboard.writeText(msg).then(() => {
      setCopiedWholesale(true);
      showToast("Wholesale order list copied to clipboard!");
      setTimeout(() => setCopiedWholesale(false), 3000);
    });
  };

  const statusScopedOrders = useMemo(() => {
    if (activeTab === "ACTIVE") {
      return orders.filter((o) => o.status === "PENDING" || (o.status === "ARRIVED" && !isExpiredArrived(o.arrivedAt, o.createdAt)));
    } else if (activeTab === "PENDING") {
      return orders.filter((o) => o.status === "PENDING");
    } else if (activeTab === "ARRIVED") {
      return orders.filter((o) => o.status === "ARRIVED" && !isExpiredArrived(o.arrivedAt, o.createdAt));
    } else if (activeTab === "UNCLAIMED") {
      return orders.filter((o) => o.status === "ARRIVED" && isExpiredArrived(o.arrivedAt, o.createdAt));
    } else if (activeTab === "FULFILLED") {
      return orders.filter((o) => o.status === "FULFILLED" && !isExpiredFulfilled(o.fulfilledAt, o.updatedAt));
    }
    return orders;
  }, [orders, activeTab]);

  const liveSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const suggestions: { label: string; sub: string; type: "item" | "customer" | "mobile" }[] = [];
    const seen = new Set<string>();

    for (const o of statusScopedOrders) {
      if (o.itemDetails && o.itemDetails.toLowerCase().includes(q)) {
        const key = `item:${o.itemDetails.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({ label: o.itemDetails, sub: `${o.customerName} · ${o.orderCode}`, type: "item" });
        }
      }
      if (o.customerName && o.customerName.toLowerCase().includes(q)) {
        const key = `cust:${o.customerName.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({ label: o.customerName, sub: `Customer · ${o.itemDetails}`, type: "customer" });
        }
      }
      if (o.customerMobile && o.customerMobile.includes(q)) {
        const key = `mob:${o.customerMobile}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({ label: o.customerMobile, sub: `${o.customerName} · ${o.itemDetails}`, type: "mobile" });
        }
      }
      if (suggestions.length >= 6) break;
    }
    return suggestions;
  }, [statusScopedOrders, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of SUGGESTION_CATEGORIES) {
      if (!cat.key) {
        counts[cat.key] = statusScopedOrders.length;
      } else {
        counts[cat.key] = statusScopedOrders.filter((o) => {
          const text = (o.itemDetails || "").toLowerCase();
          return cat.match ? cat.match.some((m) => text.includes(m)) : true;
        }).length;
      }
    }
    return counts;
  }, [statusScopedOrders]);

  const filteredOrders = useMemo(() => {
    let list = statusScopedOrders;

    if (selectedTag) {
      const cat = SUGGESTION_CATEGORIES.find((c) => c.key === selectedTag);
      if (cat && cat.match) {
        list = list.filter((o) => {
          const text = (o.itemDetails || "").toLowerCase();
          return cat.match.some((m) => text.includes(m));
        });
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          (o.customerMobile && o.customerMobile.includes(q)) ||
          o.itemDetails.toLowerCase().includes(q)
      );
    }
    return list;
  }, [statusScopedOrders, selectedTag, search]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedTag, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = showAll ? filteredOrders : filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const arrivedActiveCount = orders.filter((o) => o.status === "ARRIVED" && !isExpiredArrived(o.arrivedAt, o.createdAt)).length;
  const activeCount = pendingCount + arrivedActiveCount;
  const unclaimedCount = orders.filter((o) => o.status === "ARRIVED" && isExpiredArrived(o.arrivedAt, o.createdAt)).length;
  const fulfilledCount = orders.filter((o) => o.status === "FULFILLED" && !isExpiredFulfilled(o.fulfilledAt, o.updatedAt)).length;

  const totalAdvanceCollected = useMemo(() => {
    return orders
      .filter((o) => o.status === "PENDING" || o.status === "ARRIVED")
      .reduce((sum, o) => sum + (Number(o.advanceAmount) || 0), 0);
  }, [orders]);

  return (
    <section className="space-y-4 text-[#121212]">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[10px] bg-[#121212] px-4 py-3 text-[12px] font-medium text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#0E8345]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header: Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] leading-[20px] font-bold text-[#121212] flex items-center gap-2">
            <span>Stock &amp; Accessory Demands</span>
            <span className="rounded-full bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-mono text-[#767676]">
              {activeCount} active
            </span>
          </h2>
          <p className="text-[12px] text-[#767676] mt-0.5">
            Track customer special requests, WhatsApp updates, and wholesaler orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleExportWholesale}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#EBEBEB] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#121212] hover:bg-[#F7F7F8] hover:border-[#121212]/30 active:scale-95 transition-all min-h-[38px] cursor-pointer shadow-2xs"
              title="Copy all pending orders formatted for wholesale supplier WhatsApp"
            >
              {copiedWholesale ? <Check className="h-3.5 w-3.5 text-[#0E8345]" /> : <Copy className="h-3.5 w-3.5 text-[#767676]" />}
              <span>{copiedWholesale ? "Copied!" : `Supplier List (${pendingCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewStockOrder}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#121212] px-4 py-2 text-[12px] font-semibold text-white hover:bg-black active:scale-95 transition-all min-h-[38px] cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>Order Stock</span>
          </button>
        </div>
      </div>

      {/* 4-Card Executive Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-[#767676]">Total Active Demands</p>
          <p className="mt-1 text-lg font-bold text-[#121212]">{activeCount}</p>
          <p className="text-[10px] text-[#767676] mt-0.5">Customer &amp; shop requests</p>
        </div>

        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-[#767676]">Waiting Wholesale</p>
          <p className="mt-1 text-lg font-bold text-[#B35300]">{pendingCount}</p>
          <p className="text-[10px] text-[#767676] mt-0.5">To order from distributor</p>
        </div>

        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-[#767676]">Ready in Store</p>
          <p className="mt-1 text-lg font-bold text-[#0E8345]">{arrivedActiveCount}</p>
          <p className="text-[10px] text-[#767676] mt-0.5">Arrived for customer pickup</p>
        </div>

        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-[#767676]">Advance Collected</p>
          <p className="mt-1 text-lg font-bold text-[#121212]">{formatCurrency(totalAdvanceCollected)}</p>
          <p className="text-[10px] text-[#767676] mt-0.5">Customer prepayments</p>
        </div>
      </div>

      {/* Controls: Segmented Status Filter Chips + Search Input */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between" ref={searchBoxRef}>
        {/* Segmented Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer",
              activeTab === "ACTIVE"
                ? "bg-[#121212] text-white font-semibold shadow-2xs"
                : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
            )}
          >
            <span>All Active</span>
            <span className={activeTab === "ACTIVE" ? "text-white/80" : "text-[#767676]"}>
              ({activeCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer",
              activeTab === "PENDING"
                ? "bg-[#121212] text-white font-semibold shadow-2xs"
                : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
            )}
          >
            <span>Waiting Stock</span>
            <span className={activeTab === "PENDING" ? "text-white/80" : "text-[#767676]"}>
              ({pendingCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ARRIVED")}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer",
              activeTab === "ARRIVED"
                ? "bg-[#121212] text-white font-semibold shadow-2xs"
                : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
            )}
          >
            <span>In Store</span>
            <span className={activeTab === "ARRIVED" ? "text-white/80" : "text-[#767676]"}>
              ({arrivedActiveCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("UNCLAIMED")}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer",
              activeTab === "UNCLAIMED"
                ? "bg-[#121212] text-white font-semibold shadow-2xs"
                : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
            )}
          >
            <span>Unclaimed Shelf</span>
            <span className={activeTab === "UNCLAIMED" ? "text-white/80" : "text-[#767676]"}>
              ({unclaimedCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FULFILLED")}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer",
              activeTab === "FULFILLED"
                ? "bg-[#121212] text-white font-semibold shadow-2xs"
                : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
            )}
          >
            <span>History 14d</span>
            <span className={activeTab === "FULFILLED" ? "text-white/80" : "text-[#767676]"}>
              ({fulfilledCount})
            </span>
          </button>
        </div>

        {/* Search input with live suggestion popover */}
        <div className="relative w-full sm:w-[280px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#767676]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search mobile, item, or customer..."
            className="w-full rounded-[10px] border border-[#EBEBEB] bg-white pl-9 pr-8 py-2 text-[12px] text-[#121212] placeholder:text-[#767676] focus:border-[#121212] focus:outline-none min-h-[38px] shadow-2xs transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setShowSuggestions(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#767676] hover:text-[#121212] p-1 cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Live Typeahead Suggestions Dropdown */}
          {showSuggestions && liveSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-[12px] border border-[#EBEBEB] bg-white p-1.5 shadow-xl animate-fade-in">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#767676] flex items-center justify-between">
                <span>Matching Suggestions</span>
                <span className="text-[9px] font-normal lowercase">{liveSuggestions.length} found</span>
              </div>
              <div className="space-y-0.5">
                {liveSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearch(s.label);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-xs hover:bg-[#F7F7F8] cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#121212] truncate">{s.label}</p>
                      <p className="text-[10px] text-[#767676] truncate">{s.sub}</p>
                    </div>
                    <span className="ml-2 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[9px] font-semibold text-[#767676] shrink-0 uppercase">
                      {s.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Item Category Suggestions (Quick 1-tap filters) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
        <span className="text-[11px] font-semibold text-[#767676] shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#121212]" /> Suggestions:
        </span>
        {SUGGESTION_CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.key] || 0;
          if (cat.key && count === 0) return null;
          const isSelected = selectedTag === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedTag(isSelected ? "" : cat.key)}
              className={cn(
                "rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                isSelected
                  ? "bg-[#121212] text-white shadow-2xs font-semibold"
                  : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
              )}
            >
              <span>{cat.label}</span>
              <span className={isSelected ? "text-white/80" : "text-[#767676]"}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "UNCLAIMED" && (
        <div className="rounded-[10px] border border-[#FFE4CF] bg-[#FFF4EB] p-3 text-[12px] leading-[16px] text-[#B35300] flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Shop Shelf Stock:</strong> These items arrived over 7 days ago and were not collected by the customer. They are released to the shop shelf to sell to walk-in customers.
          </div>
        </div>
      )}

      {/* 2-Column Responsive Card Grid (Zero Void) */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#767676]">Loading stock demands...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#EBEBEB] bg-white py-12 text-center shadow-2xs">
          <ShoppingBag className="mx-auto h-8 w-8 text-[#767676]" />
          <p className="mt-2 text-[13px] font-medium text-[#767676]">
            {search || selectedTag ? "No stock requests match your filter" : "No active stock requests"}
          </p>
          {(search || selectedTag) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedTag("");
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#121212] underline hover:no-underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
          {!search && !selectedTag && (
            <button
              type="button"
              onClick={onOpenNewStockOrder}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#121212] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Order</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {pagedOrders.map((order) => {
            const isArrived = order.status === "ARRIVED";
            const isFulfilled = order.status === "FULFILLED";
            const isPending = order.status === "PENDING";
            const isExpired = isArrived && isExpiredArrived(order.arrivedAt, order.createdAt);
            const waUrl = getWhatsAppUrl(order);
            const accessoryTags = parseAccessoryTags(order.itemDetails);

            return (
              <div
                key={order.id}
                className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 sm:p-4 shadow-2xs hover:border-[#121212]/30 transition-all min-h-[165px]"
              >
                {/* Top: Order Code + Date & Status Pill */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
                      <span className="font-mono text-xs font-bold text-[#121212] tracking-tight shrink-0">
                        {order.orderCode}
                      </span>
                      <span className="text-[11px] text-[#767676] shrink-0">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4EB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B35300] border border-[#FFE4CF]">
                          <Clock className="h-3 w-3" /> Waiting Wholesale
                        </span>
                      )}
                      {isArrived && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                            isExpired
                              ? "bg-[#FFF4EB] text-[#B35300] border-[#FFE4CF]"
                              : "bg-[#EAF6EE] text-[#0E8345] border-[#D0ECD9]"
                          )}
                        >
                          <Package className="h-3 w-3" />
                          {isExpired
                            ? `On Shelf · ${formatArrivalIndicator(order.arrivedAt, order.createdAt)}`
                            : `In Store · ${formatArrivalIndicator(order.arrivedAt, order.createdAt)}`}
                        </span>
                      )}
                      {isFulfilled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F0F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#767676]">
                          <Check className="h-3 w-3" /> Fulfilled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Details & Tags */}
                  <div className="mt-2.5 min-w-0">
                    <p
                      className="font-bold text-[14px] text-[#121212] leading-tight truncate"
                      title={order.itemDetails}
                    >
                      {order.itemDetails}
                      {order.quantity > 1 && (
                        <span className="ml-1.5 text-xs font-semibold text-[#0E8345]">
                          × {order.quantity}
                        </span>
                      )}
                    </p>

                    {/* Accessory Tags */}
                    {accessoryTags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {accessoryTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#121212]"
                          >
                            <Tag className="h-2.5 w-2.5 text-[#767676]" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Line & 1-Tap Call / WhatsApp */}
                  <div className="mt-2.5 pt-2 border-t border-[#EBEBEB] flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-[#121212] truncate">
                        {order.customerName}
                      </p>
                      {order.customerMobile ? (
                        <p className="text-[11px] text-[#767676] font-mono mt-0.5">
                          {order.customerMobile}
                        </p>
                      ) : (
                        <span className="rounded-[4px] bg-[#EAF6EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#0E8345]">
                          Shop Stock Inventory
                        </span>
                      )}
                    </div>

                    {/* 1-Tap Actions */}
                    {order.customerMobile && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${order.customerMobile}`}
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                          title={`Call ${order.customerName}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#EAF6EE] text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 transition-all"
                          title={`WhatsApp ${order.customerName}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Financial status & Operational Workflow Actions */}
                <div className="mt-3 pt-2.5 border-t border-[#EBEBEB] flex items-center justify-between gap-2 text-xs">
                  {/* Left: Advance status */}
                  <div className="flex items-center gap-2">
                    {order.advanceAmount > 0 ? (
                      <span className="rounded-[4px] bg-[#EAF6EE] px-2 py-0.5 text-[11px] font-bold text-[#0E8345]">
                        Adv: {formatCurrency(order.advanceAmount)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#767676]">No Advance</span>
                    )}

                    {order.expectedPrice && (
                      <span className="text-[11px] text-[#767676]">
                        · Quote: {formatCurrency(order.expectedPrice)}
                      </span>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* When Pending: Mark Arrived */}
                    {isPending && (
                      <button
                        type="button"
                        disabled={actionInProgress === order.id}
                        onClick={() => handleUpdateStatus(order.id, "ARRIVED")}
                        className="flex items-center gap-1 rounded-[6px] bg-[#0E8345] hover:bg-[#0B6B38] px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Package className="h-3 w-3" />
                        <span>Stock Arrived</span>
                      </button>
                    )}

                    {/* When Arrived: Fulfill Action */}
                    {isArrived && (
                      <button
                        type="button"
                        disabled={actionInProgress === order.id}
                        onClick={() => handleUpdateStatus(order.id, "FULFILLED")}
                        className="flex items-center gap-1 rounded-[6px] bg-[#121212] hover:bg-black px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="Mark item as collected by customer"
                      >
                        <Check className="h-3 w-3 text-[#0E8345]" />
                        <span>Fulfill</span>
                      </button>
                    )}

                    {/* Cancel / Delete */}
                    {!isFulfilled && (
                      <button
                        type="button"
                        disabled={actionInProgress === order.id}
                        onClick={() => handleDelete(order.id)}
                        className="rounded-[6px] p-1.5 text-[#767676] hover:bg-[#FDE8E8] hover:text-[#C5221F] transition-colors cursor-pointer"
                        title="Cancel / Delete order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination & Progressive View Controls (for 8+ items) */}
      {!loading && filteredOrders.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EBEBEB] text-xs text-[#767676]">
          <div>
            Showing{" "}
            <strong className="text-[#121212]">
              {showAll ? `all ${filteredOrders.length}` : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredOrders.length)}`}
            </strong>{" "}
            of <strong className="text-[#121212]">{filteredOrders.length}</strong> items
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="rounded-[6px] border border-[#EBEBEB] bg-white px-2.5 py-1 text-xs font-semibold text-[#121212] hover:bg-[#F7F7F8] cursor-pointer transition-colors"
            >
              {showAll ? "Paginate (8 per view)" : `Show All (${filteredOrders.length})`}
            </button>

            {!showAll && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-[6px] border border-[#EBEBEB] bg-white p-1 text-[#121212] disabled:opacity-40 hover:bg-[#F7F7F8] cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-medium text-[#121212]">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-[6px] border border-[#EBEBEB] bg-white p-1 text-[#121212] disabled:opacity-40 hover:bg-[#F7F7F8] cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
