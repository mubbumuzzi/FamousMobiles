"use client";

import { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { PageLoading } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { StockDemandBoard } from "@/components/stock/StockDemandBoard";
import { StockOrderModal } from "@/components/stock/StockOrderModal";

export default function StockOrdersPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleFmRefresh = () => {
      setRefreshTrigger((t) => t + 1);
    };
    window.addEventListener("fm:refresh", handleFmRefresh);
    return () => window.removeEventListener("fm:refresh", handleFmRefresh);
  }, []);

  if (authLoading) return <PageLoading label="Loading stock demands..." />;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Stock & Accessories
          </h1>
          <p className="text-sm text-slate-500">
            Customer special requests, distributor orders & WhatsApp notifications
          </p>
        </div>

        <StockDemandBoard
          onOpenNewStockOrder={() => setIsStockModalOpen(true)}
          refreshTrigger={refreshTrigger}
        />

        <StockOrderModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          onSuccess={() => setRefreshTrigger((t) => t + 1)}
        />
      </div>
    </StaffLayout>
  );
}
