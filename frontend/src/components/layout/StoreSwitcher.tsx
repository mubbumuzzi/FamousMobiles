"use client";

import { useState, useRef, useEffect } from "react";
import { Store as StoreIcon, Check, ChevronDown, Layers } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { cn } from "@/lib/utils";

export function StoreSwitcher({ role }: { role?: string }) {
  const { stores, activeStore, activeStoreId, setActiveStoreId } = useStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (stores.length === 0) {
    return null;
  }

  const displayName = activeStoreId === "ALL"
    ? "All Stores"
    : (activeStore?.displayName || activeStore?.name || "Select Store");

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95",
          open && "ring-2 ring-blue-500/20 border-blue-400"
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <StoreIcon className="h-3 w-3" />
        </span>
        <span className="max-w-[120px] truncate sm:max-w-[160px] font-medium text-slate-800">
          {displayName}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-60 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Switch Store Branch
          </div>

          <div className="space-y-0.5">
            {role === "ADMIN" && (
              <button
                type="button"
                onClick={() => {
                  setActiveStoreId("ALL");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  activeStoreId === "ALL"
                    ? "bg-blue-50/80 text-blue-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Layers className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">All Stores</p>
                    <p className="text-[10px] text-slate-400">Combined overview</p>
                  </div>
                </div>
                {activeStoreId === "ALL" && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            )}

            {stores.map((s) => {
              const isSelected = activeStoreId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveStoreId(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-blue-50/80 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {s.code}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{s.displayName || s.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{s.city} · {s.mobile}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
