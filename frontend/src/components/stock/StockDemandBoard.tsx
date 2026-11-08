"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { StockOrder, StockOrderStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatSupplierOrderList, sanitizeItemForSupplier } from "@/lib/supplier-list-sanitizer";

interface StockDemandBoardProps {
  onOpenNewStockOrder: () => void;
  refreshTrigger?: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

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
  if (!d) return "Arrived today";
  const diffMs = Date.now() - new Date(d).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Arrived today";
  if (diffDays === 1) return "Arrived 1 day ago";
  if (diffDays >= 5 && diffDays < 7) {
    return `Arrived ${diffDays}d ago (${7 - diffDays}d left)`;
  }
  return `Arrived ${diffDays}d ago`;
}

export function StockDemandBoard({ onOpenNewStockOrder, refreshTrigger = 0 }: StockDemandBoardProps) {
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PENDING" | "ARRIVED" | "UNCLAIMED" | "FULFILLED">("ACTIVE");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedWholesale, setCopiedWholesale] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api<StockOrder[]>(`/stock-orders?status=ALL`);
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

  // Status transitions
  const handleUpdateStatus = async (orderId: string, nextStatus: StockOrderStatus) => {
    setActionInProgress(orderId);
    try {
      await api<StockOrder>(`/stock-orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (nextStatus === "ARRIVED") {
        showToast("Marked as arrived in store! You can notify the customer via WhatsApp.");
      } else if (nextStatus === "FULFILLED") {
        showToast("Order fulfilled & removed from active list!");
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

  // WhatsApp Customer message
  const handleWhatsAppCustomer = (order: StockOrder) => {
    const rawMobile = order.customerMobile.replace(/\D/g, "");
    const mobileWithCountry = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;
    const cleanItem = sanitizeItemForSupplier(order.itemDetails, order.customerName, order.customerMobile);

    const text = `Hello ${order.customerName},\n\nYour requested item *${cleanItem}* has arrived and is ready for pickup at *Famous Mobiles*!\n\n📍 *Famous Mobiles*\nOpp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.\n📞 Contact: 9063786751`;

    const url = `https://wa.me/${mobileWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Wholesaler Export List
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

  // Filter orders
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeTab === "ACTIVE") {
      list = list.filter((o) => o.status === "PENDING" || (o.status === "ARRIVED" && !isExpiredArrived(o.arrivedAt, o.createdAt)));
    } else if (activeTab === "PENDING") {
      list = list.filter((o) => o.status === "PENDING");
    } else if (activeTab === "ARRIVED") {
      list = list.filter((o) => o.status === "ARRIVED" && !isExpiredArrived(o.arrivedAt, o.createdAt));
    } else if (activeTab === "UNCLAIMED") {
      list = list.filter((o) => o.status === "ARRIVED" && isExpiredArrived(o.arrivedAt, o.createdAt));
    } else if (activeTab === "FULFILLED") {
      list = list.filter((o) => o.status === "FULFILLED" && !isExpiredFulfilled(o.fulfilledAt, o.updatedAt));
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
  }, [orders, activeTab, search]);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const arrivedActiveCount = orders.filter((o) => o.status === "ARRIVED" && !isExpiredArrived(o.arrivedAt, o.createdAt)).length;
  const activeCount = pendingCount + arrivedActiveCount;
  const unclaimedCount = orders.filter((o) => o.status === "ARRIVED" && isExpiredArrived(o.arrivedAt, o.createdAt)).length;
  const fulfilledCount = orders.filter((o) => o.status === "FULFILLED" && !isExpiredFulfilled(o.fulfilledAt, o.updatedAt)).length;

  return (
    <section className="space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[10px] bg-[#121212] px-4 py-3 text-[12px] font-medium text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#0E8345]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header: 15px bold with muted "X active" count, buttons right-aligned */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center">
          <h2 className="text-[15px] leading-[20px] font-bold text-[#121212]">
            Stock & Accessory Demands
            <span className="text-[13px] font-normal text-[#767676] ml-2">
              {activeCount} active
            </span>
          </h2>
        </div>

        {/* Right-aligned action buttons */}
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleExportWholesale}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#EBEBEB] bg-white px-3.5 py-2 text-[12px] leading-[16px] font-semibold text-[#121212] hover:bg-[#F7F7F8] hover:border-[#DFDFDF] active:scale-95 transition-all min-h-[40px] cursor-pointer"
              title="Copy all pending orders formatted for wholesale supplier WhatsApp"
            >
              {copiedWholesale ? <Check className="h-3.5 w-3.5 text-[#0E8345]" /> : <Copy className="h-3.5 w-3.5 text-[#767676]" />}
              <span>{copiedWholesale ? "Copied!" : "Supplier List"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewStockOrder}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#121212] px-4 py-2 text-[12px] leading-[16px] font-semibold text-white hover:bg-black active:scale-95 transition-all min-h-[40px] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Order Stock</span>
          </button>
        </div>
      </div>

      {/* Controls: Segmented Filter Chips + Search Input (Desktop: row, Mobile: search on top, chips below) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Mobile Search input placed on top for single-handed thumb typing */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#767676]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mobile or item..."
            className="w-full rounded-[10px] border border-[#EBEBEB] bg-white pl-9 pr-3 py-2 text-[14px] text-[#121212] placeholder:text-[#767676] focus:border-[#121212] focus:outline-none min-h-[44px]"
          />
        </div>

        {/* Segmented Filter Chips (text only, counts in muted) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] leading-[16px] transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ACTIVE"
                ? "bg-[#121212] text-white font-semibold shadow-xs"
                : "bg-white text-[#767676] border border-[#EBEBEB] hover:text-[#121212] hover:bg-[#F7F7F8]"
            }`}
          >
            <span>All Active</span>
            <span className={activeTab === "ACTIVE" ? "text-white/70" : "text-[#767676]"}>
              ({activeCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] leading-[16px] transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-[#121212] text-white font-semibold shadow-xs"
                : "bg-white text-[#767676] border border-[#EBEBEB] hover:text-[#121212] hover:bg-[#F7F7F8]"
            }`}
          >
            <span>Waiting Stock</span>
            <span className={activeTab === "PENDING" ? "text-white/70" : "text-[#767676]"}>
              ({pendingCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ARRIVED")}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] leading-[16px] transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ARRIVED"
                ? "bg-[#121212] text-white font-semibold shadow-xs"
                : "bg-white text-[#767676] border border-[#EBEBEB] hover:text-[#121212] hover:bg-[#F7F7F8]"
            }`}
          >
            <span>In Store</span>
            <span className={activeTab === "ARRIVED" ? "text-white/70" : "text-[#767676]"}>
              ({arrivedActiveCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("UNCLAIMED")}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] leading-[16px] transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
              activeTab === "UNCLAIMED"
                ? "bg-[#121212] text-white font-semibold shadow-xs"
                : "bg-white text-[#767676] border border-[#EBEBEB] hover:text-[#121212] hover:bg-[#F7F7F8]"
            }`}
          >
            <span>Unclaimed Shelf</span>
            <span className={activeTab === "UNCLAIMED" ? "text-white/70" : "text-[#767676]"}>
              ({unclaimedCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FULFILLED")}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] leading-[16px] transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
              activeTab === "FULFILLED"
                ? "bg-[#121212] text-white font-semibold shadow-xs"
                : "bg-white text-[#767676] border border-[#EBEBEB] hover:text-[#121212] hover:bg-[#F7F7F8]"
            }`}
          >
            <span>History 14d</span>
            <span className={activeTab === "FULFILLED" ? "text-white/70" : "text-[#767676]"}>
              ({fulfilledCount})
            </span>
          </button>
        </div>

        {/* Desktop Search input: right-aligned at 280px */}
        <div className="relative hidden sm:block w-[280px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#767676]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mobile or item..."
            className="w-full rounded-[10px] border border-[#EBEBEB] bg-white pl-8 pr-3 py-1.5 text-[13px] text-[#121212] placeholder:text-[#767676] focus:border-[#121212] focus:outline-none min-h-[38px]"
          />
        </div>
      </div>

      {activeTab === "UNCLAIMED" && (
        <div className="rounded-[10px] border border-[#FFE4CF] bg-[#FFF4EB] p-3 text-[12px] leading-[16px] text-[#B35300]">
          <strong>Shop Shelf Stock:</strong> These items arrived over 7 days ago and were not collected by the customer. They are released to the shop shelf to sell to walk-in customers.
        </div>
      )}

      {/* Orders List: List of clean white order cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-[12px] text-[#767676]">Loading stock orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#EBEBEB] bg-white py-8 text-center">
            <ShoppingBag className="mx-auto h-7 w-7 text-[#767676]" />
            <p className="mt-2 text-[13px] font-medium text-[#767676]">
              {search ? "No stock requests match your search" : "No active stock requests"}
            </p>
            <button
              type="button"
              onClick={onOpenNewStockOrder}
              className="mt-3 inline-flex items-center gap-1 rounded-[8px] bg-[#F7F7F8] border border-[#EBEBEB] px-3 py-1.5 text-[12px] font-semibold text-[#121212] hover:bg-slate-200/50 transition-colors cursor-pointer min-h-[36px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Order</span>
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isArrived = order.status === "ARRIVED";
            const isFulfilled = order.status === "FULFILLED";
            const isPending = order.status === "PENDING";

            return (
              <div
                key={order.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] transition-all"
              >
                {/* Left Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-[#121212]">
                      {order.orderCode}
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4EB] px-2.5 py-0.5 text-[12px] font-medium text-[#B35300] border border-[#FFE4CF] min-h-[22px]">
                        <Clock className="h-3 w-3" /> Waiting Wholesale
                      </span>
                    )}
                    {isArrived && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium min-h-[22px] border ${
                          isExpiredArrived(order.arrivedAt, order.createdAt)
                            ? "bg-[#FFF4EB] text-[#B35300] border-[#FFE4CF]"
                            : "bg-[#EAF6EE] text-[#0E8345] border-[#D0ECD9]"
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        {isExpiredArrived(order.arrivedAt, order.createdAt)
                          ? `On Shelf · ${formatArrivalIndicator(order.arrivedAt, order.createdAt)}`
                          : `In Store · ${formatArrivalIndicator(order.arrivedAt, order.createdAt)}`}
                      </span>
                    )}
                    {isFulfilled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F8] border border-[#EBEBEB] px-2.5 py-0.5 text-[12px] font-medium text-[#767676] min-h-[22px]">
                        <Check className="h-3 w-3" /> Fulfilled
                      </span>
                    )}

                    <span className="text-[12px] text-[#767676]">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Item Details */}
                  <div className="text-[14px] leading-[20px] font-bold text-[#121212]">
                    {order.itemDetails}
                    {order.quantity > 1 && (
                      <span className="ml-1.5 text-[12px] font-semibold text-[#0E8345]">
                        × {order.quantity}
                      </span>
                    )}
                  </div>

                  {/* Customer & Payment details */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-[16px] text-[#767676]">
                    <span className="font-semibold text-[#121212]">{order.customerName}</span>
                    {order.customerMobile ? (
                      <a
                        href={`tel:${order.customerMobile}`}
                        className="inline-flex items-center gap-1 text-[#121212] hover:underline font-medium"
                      >
                        <Phone className="h-3 w-3 text-[#767676]" /> {order.customerMobile}
                      </a>
                    ) : (
                      <span className="rounded-[6px] bg-[#EAF6EE] px-1.5 py-0.2 text-[10px] font-semibold text-[#0E8345]">
                        Shop Stock
                      </span>
                    )}

                    {order.advanceAmount > 0 ? (
                      <span className="rounded-[6px] bg-[#EAF6EE] px-1.5 py-0.2 text-[10px] font-bold text-[#0E8345]">
                        Adv: {formatCurrency(order.advanceAmount)}
                      </span>
                    ) : (
                      <span className="text-[#767676]">No Advance</span>
                    )}

                    {order.expectedPrice && (
                      <span className="text-[#767676]">
                        Quoted: {formatCurrency(order.expectedPrice)}
                      </span>
                    )}

                    {order.notes && (
                      <span className="text-[#767676]">
                        • {order.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EBEBEB]">
                  {/* When Pending: Mark Arrived */}
                  {isPending && (
                    <button
                      type="button"
                      disabled={actionInProgress === order.id}
                      onClick={() => handleUpdateStatus(order.id, "ARRIVED")}
                      className="flex items-center gap-1.5 rounded-[8px] bg-[#0E8345] hover:bg-[#0B6B38] px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs active:scale-95 transition-all min-h-[36px] cursor-pointer"
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span>Stock Arrived</span>
                    </button>
                  )}

                  {/* When Arrived: WhatsApp Customer & Fulfill & Remove */}
                  {isArrived && (
                    <>
                      {order.customerMobile && (
                        <button
                          type="button"
                          onClick={() => handleWhatsAppCustomer(order)}
                          className="flex items-center gap-1.5 rounded-[8px] bg-[#0E8345] hover:bg-[#0B6B38] px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs active:scale-95 transition-all min-h-[36px] cursor-pointer"
                          title="Notify customer on WhatsApp that item is ready for pickup"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={actionInProgress === order.id}
                        onClick={() => handleUpdateStatus(order.id, "FULFILLED")}
                        className="flex items-center gap-1.5 rounded-[8px] bg-[#121212] hover:bg-black px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs active:scale-95 transition-all min-h-[36px] cursor-pointer"
                        title="Mark item as collected and remove from active board"
                      >
                        <Check className="h-3.5 w-3.5 text-[#0E8345]" />
                        <span>Fulfill</span>
                      </button>
                    </>
                  )}

                  {/* Cancel / Delete */}
                  {!isFulfilled && (
                    <button
                      type="button"
                      disabled={actionInProgress === order.id}
                      onClick={() => handleDelete(order.id)}
                      className="rounded-[8px] p-2 text-[#767676] hover:bg-[#FDE8E8] hover:text-[#C5221F] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Cancel / Delete order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
