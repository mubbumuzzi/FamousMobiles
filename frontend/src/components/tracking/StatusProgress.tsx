"use client";

import { RepairStatus, REPAIR_STATUSES } from "@/lib/types";
import { cn, formatStatus } from "@/lib/utils";
import { getProgressPercent } from "@/lib/status-messages";

const PIPELINE_STATUSES: RepairStatus[] = [
  "DEVICE_RECEIVED",
  "UNDER_DIAGNOSIS",
  "WAITING_FOR_APPROVAL",
  "REPAIR_IN_PROGRESS",
  "READY_FOR_PICKUP",
];

export function StatusProgress({ status, compact }: { status: RepairStatus; compact?: boolean }) {
  if (status === "RETURNED_UNREPAIRED" || status === "NOT_REPAIRABLE_READY_FOR_PICKUP") {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950 flex items-center justify-between">
        <span className="font-semibold flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-600" />
          {status === "NOT_REPAIRABLE_READY_FOR_PICKUP" ? "Not Able to Repair (Ready for Pickup)" : "Returned Unrepaired"}
        </span>
        <span className="text-amber-800 font-medium">Charge ₹0</span>
      </div>
    );
  }

  const percent = getProgressPercent(status);
  const currentIndex = PIPELINE_STATUSES.indexOf(status);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#EBEBEB]">
          <div
            className="h-full rounded-full bg-[#121212] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-2.5 overflow-hidden rounded-full bg-[#EBEBEB]">
        <div
          className="h-full rounded-full bg-[#121212] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between gap-1 overflow-x-auto pb-1">
        {PIPELINE_STATUSES.map((s, i) => (
          <div key={s} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                i <= currentIndex ? "bg-[#121212] scale-125" : "bg-[#EBEBEB]"
              )}
            />
            <span className={cn("hidden text-[9px] font-medium leading-tight text-center sm:block", i === currentIndex ? "text-[#121212] font-semibold" : "text-[#767676]")}>
              {formatStatus(s).split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
