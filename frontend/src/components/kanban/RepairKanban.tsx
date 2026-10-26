"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, GripVertical } from "lucide-react";
import { Ticket, RepairStatus } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatStatus } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { KANBAN_COLUMNS, KanbanColumn } from "@/lib/kanban-columns";
import { api } from "@/lib/api";

type RepairKanbanProps = {
  tickets: Ticket[];
  onUpdate: () => void;
  filterAssignedToMe?: boolean;
  myName?: string;
};

export function RepairKanban({ tickets, onUpdate, filterAssignedToMe, myName }: RepairKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return KANBAN_COLUMNS[0]?.id || "received";
  });

  const activeTickets = tickets.filter((t) => t.status !== "DELIVERED");
  const visible = filterAssignedToMe && myName
    ? activeTickets.filter((t) => t.assignedTechnicianName === myName || !t.assignedTechnicianName)
    : activeTickets;

  const currentActiveColumn = KANBAN_COLUMNS.find((c) => c.id === activeTabId) || KANBAN_COLUMNS[0];
  const activeTabTickets = visible.filter((t) => currentActiveColumn.statuses.includes(t.status));

  const handleDrop = async (column: KanbanColumn, ticketId: string) => {
    const ticket = visible.find((t) => t.id === ticketId);
    if (!ticket || column.statuses.includes(ticket.status)) return;
    setUpdating(true);
    try {
      await api(`/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: column.dropStatus, remarks: `Moved to ${column.label}` }),
      });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
      setDraggingId(null);
    }
  };

  const handleQuickMove = async (ticketId: string, targetStatus: RepairStatus) => {
    setUpdating(true);
    try {
      await api(`/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus, remarks: `Status changed on mobile bench` }),
      });
      onUpdate();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to move ticket");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={cn("space-y-4", updating && "opacity-60 pointer-events-none")}>
      {/* ─────────────────────────────────────────────────────────────
          MOBILE VIEW (< lg): Sticky Stage Tabs with Badge Counters
          (Approach 1: Zero horizontal panning fatigue on smartphones)
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Sticky Stage Navigation Tabs */}
        <div className="sticky top-14 z-20 -mx-4 mb-3 border-b border-slate-200/80 bg-white/95 px-4 py-2 backdrop-blur-md shadow-xs">
          <div className="flex gap-2 overflow-x-auto kanban-scroll pb-1">
            {KANBAN_COLUMNS.map((column) => {
              const count = visible.filter((t) => column.statuses.includes(t.status)).length;
              const isActive = activeTabId === column.id;
              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => setActiveTabId(column.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all touch-target active:scale-95",
                    isActive
                      ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/10"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", column.color)} />
                  <span>{column.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-extrabold transition-colors",
                      isActive
                        ? "bg-white/20 text-white"
                        : count > 0
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "bg-slate-200/80 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Mobile Full-Width Stack */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", currentActiveColumn.color)} />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {currentActiveColumn.label} Stage
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
              {activeTabTickets.length} {activeTabTickets.length === 1 ? "device" : "devices"}
            </span>
          </div>

          {activeTabTickets.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <span className={cn("h-3 w-3 rounded-full", currentActiveColumn.color)} />
              </div>
              <p className="text-sm font-bold text-slate-700">No devices in {currentActiveColumn.label}</p>
              <p className="text-xs text-slate-400 mt-1">Tap another stage tab above to inspect other repairs.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTabTickets.map((ticket) => (
                <KanbanCard
                  key={ticket.id}
                  ticket={ticket}
                  dragging={false}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                  onQuickMove={handleQuickMove}
                  isMobileFullWidth
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          DESKTOP VIEW (>= lg): Full Panoramic Multi-Column Board
          (Preserved for widescreen 1920px workshop monitors)
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex kanban-scroll gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((column) => {
          const columnTickets = visible.filter((t) => column.statuses.includes(t.status));
          return (
            <div
              key={column.id}
              className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-slate-100/80 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("ticketId");
                if (id) handleDrop(column, id);
              }}
            >
              <div className="mb-2 flex items-center gap-2 px-1">
                <div className={cn("h-2.5 w-2.5 rounded-full", column.color)} />
                <h3 className="text-sm font-bold text-slate-800">{column.label}</h3>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {columnTickets.length}
                </span>
              </div>
              <div className="flex min-h-[120px] flex-col gap-2">
                {columnTickets.map((ticket) => (
                  <KanbanCard
                    key={ticket.id}
                    ticket={ticket}
                    dragging={draggingId === ticket.id}
                    onDragStart={() => setDraggingId(ticket.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onQuickMove={handleQuickMove}
                  />
                ))}
                {columnTickets.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">Drop here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  ticket,
  dragging,
  onDragStart,
  onDragEnd,
  onQuickMove,
  isMobileFullWidth,
}: {
  ticket: Ticket;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onQuickMove: (ticketId: string, status: RepairStatus) => void;
  isMobileFullWidth?: boolean;
}) {
  const overdue = isOverdue(ticket.estimatedDeliveryDate, ticket.status);

  if (isMobileFullWidth) {
    return (
      <div
        className={cn(
          "rounded-2xl border bg-white p-4 shadow-sm transition-all space-y-3",
          overdue ? "border-red-200 bg-red-50/15" : "border-slate-200 hover:border-slate-300"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/tickets/view?id=${ticket.id}`}
              className="text-base font-extrabold text-blue-700 hover:underline"
            >
              {ticket.trackingNumber}
            </Link>
            <p className="mt-0.5 text-base font-bold text-slate-900">
              {ticket.brand} {ticket.model}
            </p>
            <p className="text-xs text-slate-600">
              Customer: <strong className="text-slate-800">{ticket.customer.fullName}</strong>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
              {formatStatus(ticket.status)}
            </span>
            {overdue && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700 animate-pulse">
                OVERDUE
              </span>
            )}
          </div>
        </div>

        {ticket.problemDescription && (
          <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700 border border-slate-100">
            🔧 <span className="font-semibold">{ticket.problemDescription}</span>
          </p>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            EDD: {formatDate(ticket.estimatedDeliveryDate)}
          </span>
          <span className="font-bold text-slate-900">
            Bal: {Number(ticket.balanceAmount) > 0 ? formatCurrency(Number(ticket.balanceAmount)) : "Settled ✓"}
          </span>
        </div>

        {/* Mobile Quick Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <select
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none"
            value=""
            onChange={(e) => {
              if (e.target.value) onQuickMove(ticket.id, e.target.value as RepairStatus);
            }}
          >
            <option value="" disabled>Move stage...</option>
            {KANBAN_COLUMNS.map((col) => (
              <option key={col.id} value={col.dropStatus} disabled={col.statuses.includes(ticket.status)}>
                Move to {col.label}
              </option>
            ))}
          </select>
          <Link
            href={`/tickets/view?id=${ticket.id}`}
            className="touch-target flex h-10 items-center justify-center rounded-xl bg-blue-50 px-4 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all"
          >
            Workbench →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("ticketId", ticket.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "premium-card cursor-grab p-3 active:cursor-grabbing",
        dragging && "opacity-50 ring-2 ring-blue-400",
        overdue && "border-red-200 bg-red-50/30"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <Link href={`/tickets/view?id=${ticket.id}`} className="font-bold text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>
            {ticket.trackingNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{ticket.brand} {ticket.model}</p>
          <p className="truncate text-xs text-slate-500">{ticket.customer.fullName}</p>
          {ticket.problemDescription && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{ticket.problemDescription}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {overdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">OVERDUE</span>}
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Calendar className="h-3 w-3" />
              {formatDate(ticket.estimatedDeliveryDate)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{formatStatus(ticket.status)}</p>

          {/* Desktop/Tablet Touch Quick Mover */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 sm:hidden">
            <select
              className="h-8 max-w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
              value=""
              onChange={(e) => {
                if (e.target.value) onQuickMove(ticket.id, e.target.value as RepairStatus);
              }}
            >
              <option value="" disabled>Move status...</option>
              {KANBAN_COLUMNS.map((col) => (
                <option key={col.id} value={col.dropStatus} disabled={col.statuses.includes(ticket.status)}>
                  {col.label}
                </option>
              ))}
            </select>
            <Link
              href={`/tickets/view?id=${ticket.id}`}
              className="touch-target flex items-center px-2 text-xs font-bold text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              Open →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
