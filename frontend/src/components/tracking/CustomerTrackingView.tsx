"use client";

import Link from "next/link";
import { Calendar, Phone } from "lucide-react";
import { PublicTracking } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatStatus } from "@/lib/utils";
import { getCustomerStatusMessage } from "@/lib/status-messages";
import { StatusProgress } from "@/components/tracking/StatusProgress";
import { ActivityTimeline } from "@/components/tracking/ActivityTimeline";
import { ShopContact } from "@/components/ShopInfo";

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
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4 text-cyan-600" />
          <span>Expected by <strong>{formatDate(data.estimatedDeliveryDate)}</strong></span>
        </div>
      </div>

      {/* Payment summary */}
      <div className="premium-card p-4">
        <h3 className="mb-3 font-semibold text-slate-900">Payment Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Estimated</span><span>{formatCurrency(Number(data.estimatedCost))}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Advance Paid</span><span className="text-emerald-600">{formatCurrency(Number(data.advancePaid))}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
            <span>Balance Due</span>
            <span>{formatCurrency(Number(data.balanceAmount))}</span>
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
        <a href="tel:9063786751" className="mt-3 flex touch-target items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md">
          <Phone className="h-4 w-4" /> Call Shop
        </a>
      </div>
    </div>
  );
}
