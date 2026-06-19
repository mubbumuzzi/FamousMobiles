"use client";

import { TimelineEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry, i) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < entries.length - 1 && (
            <div className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-slate-200" />
          )}
          <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-blue-500 bg-white" />
          <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-slate-900">{entry.title}</p>
              <time className="text-xs text-slate-400">
                {new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </div>
            {entry.description && <p className="mt-1 text-sm text-slate-600">{entry.description}</p>}
            {entry.authorName && (
              <p className={cn("mt-2 text-xs font-medium text-blue-600")}>by {entry.authorName}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
