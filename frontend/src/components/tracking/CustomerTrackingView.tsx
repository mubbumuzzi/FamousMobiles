"use client";

import Link from "next/link";
import { Calendar, Download, MessageCircle, Phone } from "lucide-react";
import { PublicTracking } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatStatus } from "@/lib/utils";
import { getCustomerStatusMessage } from "@/lib/status-messages";
import { StatusProgress } from "@/components/tracking/StatusProgress";
import { ActivityTimeline } from "@/components/tracking/ActivityTimeline";
import { ShopContact } from "@/components/ShopInfo";
import { SHOP } from "@/lib/shop";

export function CustomerTrackingView({ data }: { data: PublicTracking }) {
  const message = getCustomerStatusMessage(data.currentStatus);
  const isReady = data.currentStatus === "READY_FOR_PICKUP";
  const isDelivered = data.currentStatus === "DELIVERED";

  return (
    <div className="animate-slide-up space-y-4">
      {/* Hero status card */}
      <div className={cn(
        "overflow-hidden rounded-2xl text-white shadow-lg",
        isDelivered ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : isReady ? "bg-gradient-to-br from-amber-500 to-orange-500" : "gradient-hero"
      )}>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Current Status</p>
          <h2 className="mt-1 text-2xl font-bold">{formatStatus(data.currentStatus)}</h2>
          <p className="mt-2 text-sm leading-relaxed opacity-95">{message}</p>
          <div className="mt-4 rounded-xl bg-white/15 p-3 backdrop-blur-sm">
            <StatusProgress status={data.currentStatus} compact />
          </div>
        </div>
      </div>

      {/* Device card */}
      <div className="premium-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Tracking ID</p>
            <p className="text-lg font-bold text-blue-700">{data.trackingNumber}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {data.brand} {data.model}
          </span>
        </div>
        {data.imeiMasked && <p className="mt-2 text-sm text-slate-500">IMEI: {data.imeiMasked}</p>}
        {data.warrantyDays && data.warrantyDays > 0 ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            🛡️ {data.warrantyDays} Days Service Warranty Included
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4 text-cyan-600" />
          <span>Expected by <strong>{formatDate(data.estimatedDeliveryDate)}</strong></span>
        </div>
      </div>

      {/* Payment summary */}
      <div className="premium-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Payment Summary</h3>
          <a
            href={`/api/public/track/${data.trackingNumber}/receipt/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> PDF Receipt
          </a>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Estimated</span>
            {Number(data.estimatedCost) === 0 && data.currentStatus !== "DELIVERED" && data.currentStatus !== "RETURNED_UNREPAIRED" ? (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Pending Diagnosis
              </span>
            ) : (
              <span className="font-semibold text-slate-800">{formatCurrency(Number(data.estimatedCost))}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Advance Paid</span>
            <span className="text-emerald-600 font-semibold">{formatCurrency(Number(data.advancePaid))}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-bold">
            <span>
              {Number(data.estimatedCost) > 0 && Number(data.balanceAmount) <= 0
                ? "Payment Status"
                : "Balance Due"}
            </span>
            {Number(data.estimatedCost) === 0 && data.currentStatus !== "DELIVERED" && data.currentStatus !== "RETURNED_UNREPAIRED" ? (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                To be determined
              </span>
            ) : Number(data.balanceAmount) <= 0 ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md">
                Paid in Full ✓
              </span>
            ) : (
              <span>{formatCurrency(Number(data.balanceAmount))}</span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="premium-card p-4">
        <h3 className="mb-4 font-semibold text-slate-900">Repair Timeline</h3>
        <ActivityTimeline entries={data.timeline} />
      </div>

      {/* Shop contact */}
      <div className="premium-card p-4">
        <h3 className="mb-2 font-semibold text-slate-900">Visit Us</h3>
        <ShopContact className="text-sm" showName={false} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a
            href={`https://wa.me/91${SHOP.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hi Famous Mobiles, I have an inquiry about my repair:\n\n` +
              `📱 Device: ${data.brand} ${data.model}\n` +
              `🔖 Ticket ID: ${data.trackingNumber}\n` +
              `⚡ Status: ${formatStatus(data.currentStatus)}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex touch-target items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-semibold text-white shadow-md transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </a>
          <a
            href={`tel:${SHOP.mobile}`}
            className="flex touch-target items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white shadow-md transition-colors"
          >
            <Phone className="h-4 w-4" /> Call Shop ({SHOP.mobile})
          </a>
        </div>
      </div>
    </div>
  );
}
