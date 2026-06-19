"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Ticket } from "@/lib/types";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

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
          <h1 className="text-2xl font-bold">Repair Tickets</h1>
          {user?.role !== "TECHNICIAN" && (
            <Link href="/tickets/new">
              <Button size="sm"><Plus className="h-4 w-4" /> New</Button>
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/tickets/${t.id}`}>
              <Card className="transition hover:border-blue-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-blue-700">{t.trackingNumber}</p>
                      <p className="text-sm text-slate-700">{t.brand} {t.model}</p>
                      <p className="text-xs text-slate-500">{t.customer.fullName} · {t.customer.mobile}</p>
                    </div>
                    <Badge variant={statusVariant(t.status)}>{formatStatus(t.status)}</Badge>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span>Est: {formatCurrency(Number(t.estimatedCost))}</span>
                    <span>Balance: {formatCurrency(Number(t.balanceAmount))}</span>
                    <span>EDD: {formatDate(t.estimatedDeliveryDate)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {tickets.length === 0 && <p className="text-center text-slate-500 py-8">No tickets yet</p>}
        </div>
      </div>
    </StaffLayout>
  );
}
