"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { CustomerTrackingView } from "@/components/tracking/CustomerTrackingView";
import { ShopContact, ShopTerms } from "@/components/ShopInfo";
import { apiPublic } from "@/lib/api";
import { PublicTracking } from "@/lib/types";

export default function TrackPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState("");
  const [mobile, setMobile] = useState("");
  const [data, setData] = useState<PublicTracking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const trackById = async (id?: string) => {
    const num = id || trackingId;
    if (!num.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const result = await apiPublic<PublicTracking>(`/public/track/${encodeURIComponent(num.trim())}`);
      setData(result);
      if (id) router.replace(`/track/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    } finally {
      setLoading(false);
    }
  };

  const trackByMobile = async () => {
    if (!mobile.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const results = await apiPublic<PublicTracking[]>(`/public/track?mobile=${encodeURIComponent(mobile.trim())}`);
      if (results.length === 1) setData(results[0]);
      else setError(`${results.length} tickets found. Enter tracking ID for a specific device.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="gradient-hero px-4 py-8 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Famous Mobiles</h1>
              <p className="text-sm opacity-90">Where is my phone?</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-8">
        {!data && (
          <div className="premium-card -mt-6 p-5 shadow-lg">
            <Field>
              <Label>Tracking ID</Label>
              <div className="mt-1 flex gap-2">
                <Input placeholder="FM-2026-000001" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} className="flex-1" />
                <Button size="lg" onClick={() => trackById()} disabled={loading}><Search className="h-4 w-4" /></Button>
              </div>
            </Field>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <Field>
              <Label>Your Mobile Number</Label>
              <div className="mt-1 flex gap-2">
                <Input type="tel" placeholder="9781887246" value={mobile} onChange={(e) => setMobile(e.target.value)} className="flex-1" />
                <Button size="lg" variant="outline" onClick={trackByMobile} disabled={loading}>Track</Button>
              </div>
            </Field>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {data && (
          <>
            <Button variant="outline" className="w-full" onClick={() => { setData(null); setError(""); }}>← Track another device</Button>
            <CustomerTrackingView data={data} />
          </>
        )}

        <ShopContact className="text-center text-sm" showName={false} />
        <ShopTerms />
        <p className="text-center text-xs text-slate-400">
          <a href="/login" className="text-blue-600 hover:underline">Staff login</a>
        </p>
      </main>
    </div>
  );
}
