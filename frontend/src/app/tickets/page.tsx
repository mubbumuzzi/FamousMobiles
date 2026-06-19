"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Ticket } from "@/lib/types";
import { formatCurrency, formatStatus } from "@/lib/utils";

function statusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP") return "warning";
  if (status.includes("WAITING")) return "warning";
  return "default";
}

export default function TicketsPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api<Ticket[]>("/tickets").then(setTickets).catch(console.error);
  }, []);

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Repair Tickets</h1>
          <Link href="/tickets/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New</Button>
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Tracking</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Device</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="hidden px-4 py-3 font-semibold text-slate-700 md:table-cell">Technician</th>
                <th className="hidden px-4 py-3 font-semibold text-slate-700 md:table-cell">Balance</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${t.id}`} className="font-semibold text-blue-700 hover:underline">
                      {t.trackingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {t.brand} {t.model}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{t.customer.fullName}</p>
                    <p className="text-slate-600">{t.customer.mobile}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(t.status)}>{formatStatus(t.status)}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-900 md:table-cell">
                    {t.assignedTechnicianName ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-900 md:table-cell">
                    {formatCurrency(Number(t.balanceAmount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && <p className="text-center text-slate-500 py-8">No tickets yet</p>}
        </div>
      </div>
    </StaffLayout>
  );
}
