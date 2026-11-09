"use client";

import { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { PageLoading } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { StockDemandBoard } from "@/components/stock/StockDemandBoard";
import { StockOrderModal } from "@/components/stock/StockOrderModal";
import { AccessorySalesTracker } from "@/components/stock/AccessorySalesTracker";
import { SellAccessoryModal } from "@/components/stock/SellAccessoryModal";
import { ShoppingBag, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StockOrdersPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [activeTab, setActiveTab] = useState<"DEMANDS" | "SALES">("DEMANDS");
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleFmRefresh = () => {
      setRefreshTrigger((t) => t + 1);
    };
    window.addEventListener("fm:refresh", handleFmRefresh);
    return () => window.removeEventListener("fm:refresh", handleFmRefresh);
  }, []);

  if (authLoading) return <PageLoading label="Loading stock & accessories..." />;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold tracking-tight text-[#121212]">
            Stock & Accessories
          </h1>
          <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
            Special customer demands, accessory counter sales & live warranty tracking
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 rounded-[10px] bg-[#F0F0F2] p-1 border border-[#EBEBEB] w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("DEMANDS")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "DEMANDS"
                ? "bg-white text-[#121212] shadow-2xs"
                : "text-[#767676] hover:text-[#121212]"
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Special Stock Demands</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SALES")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "SALES"
                ? "bg-white text-[#121212] shadow-2xs"
                : "text-[#767676] hover:text-[#121212]"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#0E8345]" />
            <span>Sold Accessories & Warranties</span>
          </button>
        </div>

        {/* Active Tab View */}
        {activeTab === "DEMANDS" ? (
          <StockDemandBoard
            onOpenNewStockOrder={() => setIsStockModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <AccessorySalesTracker
            onOpenSellModal={() => setIsSellModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Modals */}
        <StockOrderModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          onSuccess={() => setRefreshTrigger((t) => t + 1)}
        />

        <SellAccessoryModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          onSuccess={() => setRefreshTrigger((t) => t + 1)}
        />
      </div>
    </StaffLayout>
  );
}
