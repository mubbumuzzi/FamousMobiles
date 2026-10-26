"use client";

import { Wrench, ShoppingBag, X, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface IntakeForkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStockOrder: () => void;
}

export function IntakeForkModal({ isOpen, onClose, onSelectStockOrder }: IntakeForkModalProps) {
  const router = useRouter();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-all sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">New Customer Intake</h3>
            <p className="text-xs text-slate-500 mt-0.5">What are you creating for this customer?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          {/* Option 1: Mobile / Device Repair */}
          <button
            type="button"
            onClick={handleSelectRepair}
            className="group relative flex items-start gap-4 rounded-2xl border-2 border-slate-150 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/30 p-5 text-left transition-all hover:border-blue-500 hover:shadow-md hover:bg-blue-50/30 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Mobile / Device Repair
                </h4>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Screen replacement, battery, dead diagnosis, motherboard, water damage with print token and receipt.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/70 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  <ShieldCheck className="h-3 w-3" /> Full Intake Wizard
                </span>
              </div>
            </div>
          </button>

          {/* Option 2: Order Accessories / Stock Demand */}
          <button
            type="button"
            onClick={handleSelectStock}
            className="group relative flex items-start gap-4 rounded-2xl border-2 border-slate-150 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/30 p-5 text-left transition-all hover:border-emerald-500 hover:shadow-md hover:bg-emerald-50/30 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Order Stock / Accessories
                </h4>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Watch chargers, cases, lens protectors, matte glass, spare parts. 15-second counter intake with customer mobile & WhatsApp notification.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <Clock className="h-3 w-3" /> Fast 15s Intake
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
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
