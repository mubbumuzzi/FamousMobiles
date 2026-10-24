"use client";

import { Check, Circle, Clock } from "lucide-react";
import { REPAIR_STATUSES, RepairStatus } from "@/lib/types";
import { cn, formatStatus } from "@/lib/utils";

export function TrackingTimeline({ currentStatus, timeline }: { currentStatus: RepairStatus; timeline?: { title: string; createdAt: string }[] }) {
  if (currentStatus === "RETURNED_UNREPAIRED") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-base font-bold text-slate-800">Device Returned Unrepaired</p>
          <p className="mt-1 text-xs text-slate-600">
            This repair was cancelled and the device has been returned to the customer. Any advance paid was fully refunded.
          </p>
        </div>
      </div>
    );
  }

  const standardStatuses = REPAIR_STATUSES.filter((s) => s !== "RETURNED_UNREPAIRED");
  const currentIndex = standardStatuses.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {standardStatuses.map((status, index) => {
        const isComplete = index < currentIndex || currentStatus === "DELIVERED";
        const isCurrent = index === currentIndex && currentStatus !== "DELIVERED";
        const isPending = index > currentIndex;

        const entry = timeline?.find((t) => t.title.toUpperCase().includes(status.split("_")[0]));

        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  isComplete && "border-green-500 bg-green-500 text-white",
                  isCurrent && "border-blue-500 bg-blue-50 text-blue-600",
                  isPending && "border-slate-200 bg-white text-slate-300"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : isCurrent ? <Clock className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </div>
              {index < standardStatuses.length - 1 && (
                <div className={cn("w-0.5 flex-1 min-h-8", isComplete ? "bg-green-500" : "bg-slate-200")} />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p className={cn("font-medium", isCurrent ? "text-blue-700" : isComplete ? "text-slate-900" : "text-slate-400")}>
                {formatStatus(status)}
              </p>
              {entry && <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-IN")}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
