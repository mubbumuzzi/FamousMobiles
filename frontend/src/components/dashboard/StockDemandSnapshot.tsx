"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  Tag,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getCachedApi } from "@/lib/api";
import { StockOrder, StockOrderStatus } from "@/lib/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { sanitizeItemForSupplier } from "@/lib/supplier-list-sanitizer";

interface StockDemandSnapshotProps {
  onOpenNewStockOrder?: () => void;
  refreshTrigger?: number;
  waitingPartsCount?: number;
}

function parseAccessoryTags(itemText: string): string[] {
  const text = (itemText || "").toLowerCase();
  const tags: string[] = [];
  if (text.includes("display") || text.includes("screen") || text.includes("lcd") || text.includes("folder") || text.includes("touch")) {
    tags.push("Display");
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

export function StockDemandSnapshot({
  onOpenNewStockOrder,
  refreshTrigger = 0,
  waitingPartsCount = 0,
}: StockDemandSnapshotProps) {
  const stockCacheKey = "/stock-orders?status=ALL";
  const [orders, setOrders] = useState<StockOrder[]>(
    () => getCachedApi<StockOrder[]>(stockCacheKey) ?? []
  );
  const [loading, setLoading] = useState<boolean>(
    () => !getCachedApi<StockOrder[]>(stockCacheKey)
  );
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      if (!getCachedApi(stockCacheKey)) {
        setLoading(true);
      }
      const data = await api<StockOrder[]>(stockCacheKey);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load stock orders snapshot", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [refreshTrigger]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleMarkArrived = async (orderId: string) => {
    setActionInProgress(orderId);
    try {
      await api<StockOrder>(`/stock-orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ARRIVED" }),
      });
      showToast("Marked as arrived in store! Ready to notify customer.");
      fetchOrders();
    } catch (err: any) {
      alert(err?.message || "Failed to update order status");
    } finally {
      setActionInProgress(null);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "FULFILLED");
  const waitingOrders = orders.filter((o) => o.status === "PENDING");
  const arrivedOrders = orders.filter((o) => o.status === "ARRIVED");
  const fulfilledOrders = orders.filter((o) => o.status === "FULFILLED");
  const totalAdvance = activeOrders.reduce((sum, o) => sum + (Number(o.advanceAmount) || 0), 0);

  // Top 4 urgent demands waiting wholesale
  const urgentDemands = waitingOrders.slice(0, 4);

  return (
    <section aria-label="Stock and Parts Demands Snapshot" className="space-y-3.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="rounded-[10px] bg-[#121212] px-4 py-2.5 text-[13px] font-medium text-white shadow-md flex items-center justify-between animate-fade-in">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-3 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] leading-[20px] font-bold text-[#121212]">
              Stock & Parts Demands
            </h2>
            {!loading && (
              <span className="rounded-full bg-[#F7F7F8] border border-[#EBEBEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#767676]">
                {activeOrders.length} active
              </span>
            )}
          </div>
          <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
            Customer special requests, wholesale replenishment & workshop spare parts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNewStockOrder && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenNewStockOrder}
              className="h-8.5 px-3 text-[12px] font-semibold gap-1.5 border-[#EBEBEB] hover:bg-[#F7F7F8]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Order Stock</span>
            </Button>
          )}

          <Link href="/stock-orders">
            <Button
              variant="default"
              className="h-8.5 px-3 text-[12px] font-semibold gap-1.5 bg-[#121212] text-white hover:bg-black"
            >
              <span>Manage Demands</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Card Executive Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Metric 1: Waiting Wholesale */}
        <Link
          href="/stock-orders"
          className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 hover:border-[#DFDFDF] hover:bg-[#FCFCFD] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] block"
        >
          <div className="flex items-center justify-between text-[#767676] mb-1">
            <span className="text-[11px] font-medium tracking-wide uppercase">Waiting Wholesale</span>
            <span className="h-2 w-2 rounded-full bg-[#B35300]" />
          </div>
          <div className="text-[22px] font-bold text-[#121212] leading-tight">
            {loading ? <Skeleton className="h-6 w-12 my-1" /> : waitingOrders.length}
          </div>
          <p className="text-[11px] text-[#767676] mt-0.5">Needs distributor order</p>
        </Link>

        {/* Metric 2: Ready in Store */}
        <Link
          href="/stock-orders"
          className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 hover:border-[#DFDFDF] hover:bg-[#FCFCFD] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] block"
        >
          <div className="flex items-center justify-between text-[#767676] mb-1">
            <span className="text-[11px] font-medium tracking-wide uppercase">Ready in Store</span>
            <span className="h-2 w-2 rounded-full bg-[#0E8345]" />
          </div>
          <div className="text-[22px] font-bold text-[#121212] leading-tight">
            {loading ? <Skeleton className="h-6 w-12 my-1" /> : arrivedOrders.length}
          </div>
          <p className="text-[11px] text-[#767676] mt-0.5">Ready for customer pickup</p>
        </Link>

        {/* Metric 3: Fulfilled Orders */}
        <Link
          href="/stock-orders"
          className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 hover:border-[#DFDFDF] hover:bg-[#FCFCFD] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] block"
        >
          <div className="flex items-center justify-between text-[#767676] mb-1">
            <span className="text-[11px] font-medium tracking-wide uppercase">Fulfilled Orders</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8345]" />
          </div>
          <div className="text-[22px] font-bold text-[#121212] leading-tight">
            {loading ? <Skeleton className="h-6 w-12 my-1" /> : fulfilledOrders.length}
          </div>
          <p className="text-[11px] text-[#767676] mt-0.5">Completed & handed over</p>
        </Link>

        {/* Metric 4: Advance Collected */}
        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-[#767676] mb-1">
            <span className="text-[11px] font-medium tracking-wide uppercase">Advance Held</span>
            <Package className="h-3.5 w-3.5 text-[#767676]" />
          </div>
          <div className="text-[22px] font-bold text-[#121212] leading-tight">
            {loading ? <Skeleton className="h-6 w-16 my-1" /> : formatCurrency(totalAdvance)}
          </div>
          <p className="text-[11px] text-[#767676] mt-0.5">Deposit on pending stock</p>
        </div>
      </div>

      {/* Urgent Demands Spotlight (Max 4 items) */}
      <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-[#121212] flex items-center gap-1.5">
            <span>Pending Wholesale Orders</span>
            <span className="text-[11px] font-normal text-[#767676]">
              ({waitingOrders.length} pending)
            </span>
          </h3>
          <Link
            href="/stock-orders"
            className="text-[12px] font-semibold text-[#121212] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-28 w-full rounded-[10px]" />
            <Skeleton className="h-28 w-full rounded-[10px]" />
          </div>
        ) : urgentDemands.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#EBEBEB] bg-[#F7F7F8]/60 p-6 text-center">
            <CheckCircle2 className="h-6 w-6 text-[#0E8345] mx-auto mb-1.5" />
            <p className="text-[13px] font-semibold text-[#121212]">All wholesale stock is up to date</p>
            <p className="text-[11px] text-[#767676] mt-0.5">
              No customer accessory requests currently waiting for distributor ordering.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentDemands.map((order) => {
              const tags = parseAccessoryTags(order.itemDetails);
              const cleanItem = sanitizeItemForSupplier(
                order.itemDetails,
                order.customerName,
                order.customerMobile
              );
              const waUrl = getWhatsAppUrl(order);

              return (
                <div
                  key={order.id}
                  className="flex flex-col justify-between rounded-[10px] border border-[#EBEBEB] bg-[#FDFDFD] p-3 hover:border-[#DFDFDF] hover:bg-white transition-all shadow-xs"
                >
                  <div>
                    {/* Top Order Number & Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#121212]">
                        {order.orderCode}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#FFF4E6] border border-[#FFE0B2] px-2 py-0.5 text-[10px] font-semibold text-[#B35300]">
                        Waiting Wholesale
                      </span>
                    </div>

                    {/* Clean Item Title */}
                    <p className="text-[13px] leading-[18px] font-bold text-[#121212] line-clamp-1">
                      {order.quantity > 1 ? `${order.quantity}x ` : ""}
                      {cleanItem}
                    </p>

                    {/* Accessory Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 my-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-0.5 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.2 text-[10px] font-medium text-[#121212]"
                          >
                            <Tag className="h-2.5 w-2.5 text-[#767676]" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Customer info */}
                    <p className="text-[11px] text-[#767676] truncate mt-1">
                      {order.customerName || "Shop Stock"}
                      {order.customerMobile && ` · ${order.customerMobile}`}
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between border-t border-[#EBEBEB] pt-2 mt-2">
                    <div className="flex items-center gap-1.5">
                      {order.customerMobile && (
                        <>
                          <a
                            href={`tel:${order.customerMobile.replace(/\D/g, "")}`}
                            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F0F0F2] transition-colors"
                            title="Direct Call"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#25D366]/30 bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 transition-colors"
                              title="WhatsApp Notification"
                            >
                              <span className="text-[11px] font-bold">WA</span>
                            </a>
                          )}
                        </>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionInProgress === order.id}
                      onClick={() => handleMarkArrived(order.id)}
                      className="h-7 px-2.5 text-[11px] font-semibold border-[#0E8345]/30 text-[#0E8345] hover:bg-[#E8F5E9] hover:border-[#0E8345]"
                    >
                      {actionInProgress === order.id ? (
                        "Updating..."
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Stock Arrived
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Link to Full Board */}
        <div className="border-t border-[#EBEBEB] mt-3.5 pt-2.5 text-center">
          <Link
            href="/stock-orders"
            className="inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#121212] hover:underline"
          >
            <span>Open Full Stock & Accessories Board ({activeOrders.length} active demands)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
