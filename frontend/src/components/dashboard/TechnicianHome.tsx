"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, Clock, Plus, Search, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepairKanban } from "@/components/kanban/RepairKanban";
import { Ticket } from "@/lib/types";
import { isOverdue } from "@/lib/status-messages";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TechnicianHomeProps = {
  tickets: Ticket[];
  userName?: string;
  loading: boolean;
  onRefresh: () => void;
};

export function TechnicianHome({ tickets, userName, loading, onRefresh }: TechnicianHomeProps) {
  const router = useRouter();
  const active = tickets.filter((t) => t.status !== "DELIVERED");
  const mine = active.filter((t) => t.assignedTechnicianName === userName);
  const unassigned = active.filter((t) => !t.assignedTechnicianName);
  const overdue = mine.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status));

  const kpis = [
    {
      label: "Assigned to Me",
      value: loading ? null : mine.length,
      helper: "Your queue",
      dot: null,
    },
    {
      label: "Unassigned",
      value: loading ? null : unassigned.length,
      helper: "Available to pick",
      dot: null,
    },
    {
      label: "Overdue",
      value: loading ? null : overdue.length,
      helper: overdue.length > 0 ? "Urgent attention" : "On schedule",
      dot: overdue.length > 0 ? "bg-[#C5221F]" : null,
    },
    {
      label: "Total Active",
      value: loading ? null : active.length,
      helper: "Shop-wide",
      dot: null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-[#121212]">
      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">
            My Workshop
          </h1>
          <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
            {userName ? `Logged in as ${userName} · ` : ""}Drag cards to update repair status
          </p>
        </div>

        <Link href="/tickets/new">
          <Button variant="primary" className="h-10 px-4 text-[13px] font-semibold gap-1.5 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>New Ticket</span>
          </Button>
        </Link>
      </div>

      {/* 2. Fast Search Bar (44px) */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="flex h-11 w-full items-center gap-3 rounded-[10px] border border-[#EBEBEB] bg-white px-3.5 text-left text-[14px] text-[#767676] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] transition-all cursor-pointer"
        >
          <Search className="h-4 w-4 text-[#767676] shrink-0" />
          <span className="truncate">Search by customer name, mobile, brand, or tracking ID...</span>
        </button>
      </div>

      {/* 3. Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/tickets/new"
          className="group flex flex-col justify-between rounded-[12px] bg-[#121212] p-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#222222] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/10 text-white transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-white/50 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-4">
            <p className="text-[15px] font-bold leading-snug">New Ticket</p>
            <p className="text-[12px] text-white/70 mt-0.5 leading-snug">Fast device intake</p>
          </div>
        </Link>

        <Link
          href="/search"
          className="group flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] transition-transform group-hover:scale-105">
              <ClipboardList className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-[#767676] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-4">
            <p className="text-[15px] font-bold text-[#121212] leading-snug">Find Job</p>
            <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">Search active tickets</p>
          </div>
        </Link>
      </div>

      {/* 4. Unified KPI Section: Single white card with 1px dividers */}
      <div className="overflow-hidden rounded-[12px] border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#EBEBEB] sm:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex h-24 flex-col justify-between p-3.5 text-left select-none"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {kpi.dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", kpi.dot)} />}
                <span className="truncate text-[12px] leading-tight font-medium text-[#767676]">
                  {kpi.label}
                </span>
              </div>

              <div>
                {kpi.value === null ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-[28px] font-bold leading-none tracking-tight text-[#121212]">
                    {kpi.value}
                  </p>
                )}
              </div>

              <p className="truncate text-[11px] leading-none text-[#767676]">
                {kpi.helper}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Repair Kanban Board */}
      <section aria-label="Repair Board">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-[#121212]">Repair Board</h2>
            <span className="rounded-full bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-semibold text-[#767676]">
              {active.length} active
            </span>
          </div>
          <Link href="/tickets" className="text-[13px] font-semibold text-[#121212] hover:text-[#2B59FF] transition-colors">
            List view →
          </Link>
        </div>

        {!loading && (
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <RepairKanban tickets={tickets} onUpdate={onRefresh} filterAssignedToMe={false} myName={userName} />
          </div>
        )}
      </section>
    </div>
  );
}
