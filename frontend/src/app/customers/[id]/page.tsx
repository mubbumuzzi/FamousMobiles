"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Customer, Ticket } from "@/lib/types";
import { formatStatus } from "@/lib/utils";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuthGuard();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [repairs, setRepairs] = useState<Ticket[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    api<Customer>(`/customers/${id}`).then(setCustomer);
    api<Ticket[]>(`/customers/${id}/repairs`).then(setRepairs);
  }, [id, authLoading, user]);

  if (authLoading || !customer) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">{customer.fullName}</h1>
        <p className="text-slate-600">{customer.mobile}{customer.alternateMobile ? ` · Alt: ${customer.alternateMobile}` : ""} · {customer.customerCode}</p>
        <h2 className="font-semibold">Repair History</h2>
        {repairs.map((t) => (
          <Link key={t.id} href={`/tickets/${t.id}`}>
            <Card className="mb-2 hover:border-blue-300">
              <CardContent className="flex justify-between p-4">
                <span className="font-medium text-blue-700">{t.trackingNumber}</span>
                <span className="text-sm">{formatStatus(t.status)}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </StaffLayout>
  );
}
