"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, GripVertical } from "lucide-react";
import { Ticket, RepairStatus } from "@/lib/types";
import { cn, formatDate, formatStatus } from "@/lib/utils";
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

  const activeTickets = tickets.filter((t) => t.status !== "DELIVERED");
  const visible = filterAssignedToMe && myName
    ? activeTickets.filter((t) => t.assignedTechnicianName === myName || !t.assignedTechnicianName)
    : activeTickets;

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
    <div className={cn("kanban-scroll flex gap-3 overflow-x-auto pb-2", updating && "opacity-60 pointer-events-none")}>
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
  );
}

function KanbanCard({
  ticket,
  dragging,
  onDragStart,
  onDragEnd,
  onQuickMove,
}: {
  ticket: Ticket;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onQuickMove: (ticketId: string, status: RepairStatus) => void;
}) {
  const overdue = isOverdue(ticket.estimatedDeliveryDate, ticket.status);

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
          <Link href={`/tickets/${ticket.id}`} className="font-bold text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>
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

          {/* Mobile Touch Quick Mover */}
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
              href={`/tickets/${ticket.id}`}
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
