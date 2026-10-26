"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  Phone,
  MessageCircle,
  Share2,
  Trash2,
  Search,
  Check,
  Plus,
  Copy,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { StockOrder, StockOrderStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SHOP } from "@/lib/shop";

interface StockDemandBoardProps {
  onOpenNewStockOrder: () => void;
  refreshTrigger?: number;
}

export function StockDemandBoard({ onOpenNewStockOrder, refreshTrigger = 0 }: StockDemandBoardProps) {
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PENDING" | "ARRIVED" | "FULFILLED">("ACTIVE");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedWholesale, setCopiedWholesale] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Fetch both active and fulfilled
      const filter = activeTab === "FULFILLED" ? "FULFILLED" : "ALL";
      const data = await api<StockOrder[]>(`/stock-orders?status=${filter}`);
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

    const text = `Hello ${order.customerName},\n\nYour requested item *${order.itemDetails}* has arrived and is ready for pickup at *Famous Mobiles*!\n\n📍 *Famous Mobiles*\nOpp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.\n📞 Contact: 9063786751`;

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

    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    let msg = `📦 *FAMOUS MOBILES - ACCESSORY STOCK REQUIREMENTS*\n📅 ${todayStr}\n\n`;
    pendingOrders.forEach((o, idx) => {
      msg += `${idx + 1}. *${o.itemDetails}* (Qty: ${o.quantity || 1})\n`;
    });
    msg += `\nTotal: ${pendingOrders.length} pending customer orders. Please confirm availability & dispatch.`;

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
      list = list.filter((o) => o.status === "PENDING" || o.status === "ARRIVED");
    } else if (activeTab === "PENDING") {
      list = list.filter((o) => o.status === "PENDING");
    } else if (activeTab === "ARRIVED") {
      list = list.filter((o) => o.status === "ARRIVED");
    } else if (activeTab === "FULFILLED") {
      list = list.filter((o) => o.status === "FULFILLED");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerMobile.includes(q) ||
          o.itemDetails.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeTab, search]);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const arrivedCount = orders.filter((o) => o.status === "ARRIVED").length;
  const activeCount = pendingCount + arrivedCount;

  return (
    <section className="premium-card p-4 sm:p-5">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Stock & Accessory Demands</h2>
              {activeCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {activeCount} Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Track cases, chargers & parts requested by counter customers</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleExportWholesale}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors shadow-sm"
              title="Copy all pending orders formatted for wholesale supplier WhatsApp"
            >
              {copiedWholesale ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedWholesale ? "Copied!" : "Supplier List"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewStockOrder}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Order Stock</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "ACTIVE"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "PENDING"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ⏳ Waiting Stock ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ARRIVED")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "ARRIVED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📦 In Store ({arrivedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("FULFILLED")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "FULFILLED"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            History (Fulfilled)
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mobile or item..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="mt-3 space-y-2.5">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading stock orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-medium text-slate-500">
              {search ? "No stock requests match your search" : "No active stock requests"}
            </p>
            <button
              type="button"
              onClick={onOpenNewStockOrder}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
            >
              <Plus className="h-3 w-3" /> Create First Order
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
                className={`relative flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 transition-all ${
                  isArrived
                    ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                    : isFulfilled
                    ? "border-slate-200 bg-slate-50/50 opacity-80"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Left Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      {order.orderCode}
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="h-3 w-3" /> WAITING STOCK
                      </span>
                    )}
                    {isArrived && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">
                        <Package className="h-3 w-3" /> IN STORE (READY)
                      </span>
                    )}
                    {isFulfilled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        <Check className="h-3 w-3" /> FULFILLED
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Item Description */}
                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {order.itemDetails}
                    {order.quantity > 1 && (
                      <span className="ml-1.5 text-xs font-semibold text-emerald-700">
                        × {order.quantity}
                      </span>
                    )}
                  </div>

                  {/* Customer & Payment details */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{order.customerName}</span>
                    <a
                      href={`tel:${order.customerMobile}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                    >
                      <Phone className="h-3 w-3" /> {order.customerMobile}
                    </a>

                    {order.advanceAmount > 0 ? (
                      <span className="rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        Advance: {formatCurrency(order.advanceAmount)}
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        No Advance
                      </span>
                    )}

                    {order.expectedPrice && (
                      <span className="text-[11px] text-slate-500">
                        Quoted: {formatCurrency(order.expectedPrice)}
                      </span>
                    )}

                    {order.notes && (
                      <span className="italic text-slate-500 text-[11px]">
                        • {order.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* When Pending: Mark Arrived */}
                  {isPending && (
                    <button
                      type="button"
                      disabled={actionInProgress === order.id}
                      onClick={() => handleUpdateStatus(order.id, "ARRIVED")}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span>Stock Arrived</span>
                    </button>
                  )}

                  {/* When Arrived: WhatsApp Customer & Fulfill & Remove */}
                  {isArrived && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleWhatsAppCustomer(order)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
                        title="Notify customer on WhatsApp that item is ready for pickup"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress === order.id}
                        onClick={() => handleUpdateStatus(order.id, "FULFILLED")}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black px-3 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
                        title="Mark item as collected and remove from active board"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Fulfill & Remove</span>
                      </button>
                    </>
                  )}

                  {/* Cancel / Delete */}
                  {!isFulfilled && (
                    <button
                      type="button"
                      disabled={actionInProgress === order.id}
                      onClick={() => handleDelete(order.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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
