"use client";

import { Wrench, ShoppingBag, X, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

interface IntakeForkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStockOrder: () => void;
}

export function IntakeForkModal({ isOpen, onClose, onSelectStockOrder }: IntakeForkModalProps) {
  const router = useRouter();

  // Android hardware back button handler
  useAndroidBackButton(onClose, isOpen, 15);

  if (!isOpen) return null;

  const handleSelectRepair = () => {
    onClose();
    router.push("/tickets/new");
  };

  const handleSelectStock = () => {
    onClose();
    onSelectStockOrder();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 sheet-backdrop transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up Bottom Sheet on Mobile / Centered Card on Desktop */}
      <div className="relative w-full max-w-lg rounded-t-[16px] sm:rounded-[12px] border border-[#EBEBEB] bg-white p-5 pb-safe sm:p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-fade-in sheet-container">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#EBEBEB]" />

        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#EBEBEB]">
          <div>
            <h3 className="text-[18px] font-bold text-[#121212]">New Customer Intake</h3>
            <p className="text-[12px] text-[#767676] mt-0.5">What are you creating for this customer?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 sm:mt-5 grid grid-cols-1 gap-3">
          {/* Option 1: Mobile / Device Repair */}
          <button
            type="button"
            onClick={handleSelectRepair}
            className="group relative flex items-start gap-3.5 rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#121212] hover:bg-[#F7F7F8] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#121212] text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-[15px] font-bold text-[#121212]">
                  Mobile / Device Repair
                </h4>
                <ArrowRight className="h-4 w-4 text-[#767676] group-hover:text-[#121212] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-1 text-[12px] text-[#767676] leading-relaxed">
                Screen replacement, battery, dead diagnosis, motherboard, water damage with print token and receipt.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-semibold text-[#121212]">
                  <ShieldCheck className="h-3 w-3" /> Full Intake Wizard
                </span>
              </div>
            </div>
          </button>

          {/* Option 2: Order Accessories / Stock Demand */}
          <button
            type="button"
            onClick={handleSelectStock}
            className="group relative flex items-start gap-3.5 rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#121212] hover:bg-[#F7F7F8] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#F0F0F2] text-[#121212]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-[15px] font-bold text-[#121212]">
                  Order Stock / Accessories
                </h4>
                <ArrowRight className="h-4 w-4 text-[#767676] group-hover:text-[#121212] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-1 text-[12px] text-[#767676] leading-relaxed">
                Watch chargers, cases, lens protectors, matte glass, spare parts. 15-second counter intake with customer mobile & WhatsApp notification.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-semibold text-[#0E8345]">
                  <Clock className="h-3 w-3" /> Fast 15s Intake
                </span>
                <span className="inline-flex items-center rounded-[6px] bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-medium text-[#767676]">
                  1-Click Remove when Arrived
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
