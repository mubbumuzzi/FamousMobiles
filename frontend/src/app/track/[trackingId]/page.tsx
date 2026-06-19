"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Smartphone } from "lucide-react";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPublic } from "@/lib/api";
import { PublicTracking } from "@/lib/types";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

export default function TrackByIdPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const [data, setData] = useState<PublicTracking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiPublic<PublicTracking>(`/public/track/${encodeURIComponent(trackingId)}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [trackingId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-2 font-bold text-blue-700">
          <Smartphone className="h-5 w-5" />
          Famous Mobiles — {trackingId}
        </div>
      </header>
      <div className="mx-auto max-w-lg space-y-4 p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {data && (
          <>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-blue-700">{data.trackingNumber}</p>
                  <Badge variant="warning">{formatStatus(data.currentStatus)}</Badge>
                </div>
                <p className="text-lg font-semibold">{data.brand} {data.model}</p>
                {data.imeiMasked && <p className="text-sm text-slate-500">IMEI: {data.imeiMasked}</p>}
                <p className="text-sm">Estimated Delivery: <strong>{formatDate(data.estimatedDeliveryDate)}</strong></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Estimated Cost</span><span>{formatCurrency(Number(data.estimatedCost))}</span></div>
                <div className="flex justify-between"><span>Advance Paid</span><span>{formatCurrency(Number(data.advancePaid))}</span></div>
                <div className="flex justify-between font-semibold"><span>Balance</span><span>{formatCurrency(Number(data.balanceAmount))}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Repair Progress</CardTitle></CardHeader>
              <CardContent><TrackingTimeline currentStatus={data.currentStatus} timeline={data.timeline} /></CardContent>
            </Card>
          </>
        )}
        {!data && !error && <p className="text-center text-slate-500">Loading...</p>}
      </div>
    </div>
  );
}
