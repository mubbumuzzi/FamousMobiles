"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardList, Clock, Wrench } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { QuickAction } from "@/components/ui/quick-action";
import { RepairKanban } from "@/components/kanban/RepairKanban";
import { Ticket } from "@/lib/types";
import { isOverdue } from "@/lib/status-messages";

type TechnicianHomeProps = {
  tickets: Ticket[];
  userName?: string;
  loading: boolean;
  onRefresh: () => void;
};

export function TechnicianHome({ tickets, userName, loading, onRefresh }: TechnicianHomeProps) {
  const active = tickets.filter((t) => t.status !== "DELIVERED");
  const mine = active.filter((t) => t.assignedTechnicianName === userName);
  const unassigned = active.filter((t) => !t.assignedTechnicianName);
  const overdue = mine.filter((t) => isOverdue(t.estimatedDeliveryDate, t.status));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Workshop</h1>
        <p className="text-sm text-slate-500">Drag cards to update repair status</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Assigned to Me" value={loading ? null : mine.length} icon={Wrench} tone="primary" />
        <KpiCard label="Unassigned" value={loading ? null : unassigned.length} icon={ClipboardList} tone="secondary" />
        <KpiCard label="Overdue" value={loading ? null : overdue.length} icon={AlertTriangle} tone={overdue.length ? "danger" : "accent"} />
        <KpiCard label="Total Active" value={loading ? null : active.length} icon={Clock} tone="accent" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickAction href="/tickets/new" icon={Wrench} label="New Ticket" tone="primary" />
        <QuickAction href="/search" icon={ClipboardList} label="Find Job" tone="secondary" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Repair Board</h2>
          <Link href="/tickets" className="text-sm font-medium text-blue-600 hover:underline">List view</Link>
        </div>
        {!loading && (
          <RepairKanban tickets={tickets} onUpdate={onRefresh} filterAssignedToMe={false} myName={userName} />
        )}
      </section>
    </div>
  );
}
