"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Smartphone } from "lucide-react";
import { CustomerTrackingView } from "@/components/tracking/CustomerTrackingView";
import { ShopTerms } from "@/components/ShopInfo";
import { apiPublic } from "@/lib/api";
import { PublicTracking } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-header text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Track your repair</p>
            <p className="font-bold text-slate-900">Famous Mobiles</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg p-4 pb-8">
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!data && !error && (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        )}
        {data && <CustomerTrackingView data={data} />}
        <ShopTerms className="mt-6" />
      </main>
    </div>
  );
}
