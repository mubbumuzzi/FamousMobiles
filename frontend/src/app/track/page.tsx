"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiPublic } from "@/lib/api";
import { PublicTracking } from "@/lib/types";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

export default function TrackPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState("");
  const [mobile, setMobile] = useState("");
  const [data, setData] = useState<PublicTracking | null>(null);
  const [error, setError] = useState("");

  const trackById = async (id?: string) => {
    const num = id || trackingId;
    if (!num.trim()) return;
    setError("");
    try {
      const result = await apiPublic<PublicTracking>(`/public/track/${encodeURIComponent(num.trim())}`);
      setData(result);
      if (id) router.replace(`/track/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
      setData(null);
    }
  };

  const trackByMobile = async () => {
    if (!mobile.trim()) return;
    setError("");
    try {
      const results = await apiPublic<PublicTracking[]>(`/public/track?mobile=${encodeURIComponent(mobile.trim())}`);
      if (results.length === 1) {
        setData(results[0]);
      } else {
        setError(`${results.length} tickets found. Enter tracking ID for specific device.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-slate-900">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-2 font-bold text-blue-700">
          <Smartphone className="h-5 w-5" />
          Famous Mobiles — Track Repair
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Track Your Device</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Tracking ID</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="FM-2026-000001" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
                <Button onClick={() => trackById()}>Track</Button>
              </div>
            </div>
            <div className="text-center text-xs text-slate-400">OR</div>
            <div>
              <Label>Mobile Number</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                <Button variant="outline" onClick={trackByMobile}>Find</Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        {data && (
          <>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-blue-700">{data.trackingNumber}</p>
                  <Badge variant="warning">{formatStatus(data.currentStatus)}</Badge>
                </div>
                <p className="text-lg font-semibold">{data.brand} {data.model}</p>
                {data.color && <p className="text-sm text-slate-500">Color: {data.color}</p>}
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

        <p className="text-center text-xs text-slate-400">
          <a href="/login" className="text-blue-600">Staff login</a>
        </p>
      </div>
    </div>
  );
}
