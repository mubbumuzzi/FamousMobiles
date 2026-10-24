"use client";

import { RepairStatus, REPAIR_STATUSES } from "@/lib/types";
import { cn, formatStatus } from "@/lib/utils";
import { getProgressPercent } from "@/lib/status-messages";

const PIPELINE_STATUSES: RepairStatus[] = [
  "DEVICE_RECEIVED",
  "UNDER_DIAGNOSIS",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_PARTS",
  "REPAIR_IN_PROGRESS",
  "QUALITY_CHECK",
  "READY_FOR_PICKUP",
];

export function StatusProgress({ status, compact }: { status: RepairStatus; compact?: boolean }) {
  if (status === "RETURNED_UNREPAIRED") {
    return (
      <div className="rounded-lg bg-slate-100/90 border border-slate-300 p-2 text-xs text-slate-800 flex items-center justify-between">
        <span className="font-semibold flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" /> Returned Unrepaired
        </span>
        <span className="text-slate-500 font-medium">Repair Cancelled · Cost ₹0</span>
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
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between gap-1 overflow-x-auto pb-1">
        {PIPELINE_STATUSES.map((s, i) => (
          <div key={s} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                i <= currentIndex ? "bg-blue-600 scale-125" : "bg-slate-200"
              )}
            />
            <span className={cn("hidden text-[9px] font-medium leading-tight text-center sm:block", i === currentIndex ? "text-blue-700" : "text-slate-400")}>
              {formatStatus(s).split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
