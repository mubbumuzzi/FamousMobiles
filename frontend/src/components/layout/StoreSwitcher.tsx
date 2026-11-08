"use client";

import { useState, useRef, useEffect } from "react";
import { Store as StoreIcon, Check, ChevronDown, Layers } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { cn } from "@/lib/utils";

export function StoreSwitcher({
  role,
  align = "left",
}: {
  role?: string;
  align?: "left" | "right";
}) {
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
          "flex items-center gap-2 rounded-[10px] border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-medium text-[#121212] shadow-2xs transition-all hover:bg-[#F7F7F8] hover:border-[#DFDFDF] focus:outline-none focus:ring-2 focus:ring-[#121212]/10 active:scale-95 cursor-pointer",
          open && "ring-2 ring-[#121212]/10 border-[#121212]"
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[#F0F0F2] text-[#121212]">
          <StoreIcon className="h-3 w-3" />
        </span>
        <span className="max-w-[150px] sm:max-w-[220px] truncate font-medium text-[#121212]">
          {displayName}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[#767676] transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-[280px] sm:w-[300px] max-w-[calc(100vw-24px)] rounded-[12px] border border-[#EBEBEB] bg-white p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#767676]">
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
                  "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors cursor-pointer",
                  activeStoreId === "ALL"
                    ? "bg-[#F0F0F2] text-[#121212] font-semibold"
                    : "text-[#121212] hover:bg-[#F7F7F8]"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#EBEBEB] text-[#121212]">
                    <Layers className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#121212] truncate">All Stores</p>
                    <p className="text-[10px] text-[#767676] truncate">Combined overview</p>
                  </div>
                </div>
                {activeStoreId === "ALL" && <Check className="h-4 w-4 shrink-0 text-[#121212] ml-2" />}
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
                    "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-[#F0F0F2] text-[#121212] font-semibold"
                      : "text-[#121212] hover:bg-[#F7F7F8]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold",
                        isSelected ? "bg-[#121212] text-white" : "bg-[#F0F0F2] text-[#121212]"
                      )}
                    >
                      {s.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#121212]">{s.displayName || s.name}</p>
                      <p className="truncate text-[10px] text-[#767676]">{s.city} · {s.mobile}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#121212] ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
