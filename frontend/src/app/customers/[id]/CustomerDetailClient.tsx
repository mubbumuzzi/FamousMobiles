"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Customer, Ticket } from "@/lib/types";
import { formatStatus, formatCustomerMobiles, getVipStatus, getWarrantyStatus, cn } from "@/lib/utils";

export default function CustomerDetailClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = params?.id || searchParams.get("id");
  const id = rawId && rawId !== "view" ? rawId : searchParams.get("id") || "";

  const { user, loading: authLoading } = useAuthGuard();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [repairs, setRepairs] = useState<Ticket[]>([]);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    api<Customer>(`/customers/${id}`).then(setCustomer);
    api<Ticket[]>(`/customers/${id}/repairs`).then(setRepairs);
  }, [id, authLoading, user]);

  if (authLoading || !customer) return null;

  const vip = getVipStatus(repairs.length);

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">{customer.fullName}</h1>
          {vip.isRepeat && (
            <span className={cn("text-xs px-2.5 py-1 rounded-full border", vip.badgeClass)}>
              {vip.label}
            </span>
          )}
        </div>
        <p className="text-slate-600">{formatCustomerMobiles(customer)} · {customer.customerCode}</p>
        <h2 className="font-semibold text-slate-900 pt-2">Repair History ({repairs.length})</h2>
        {repairs.map((t) => {
          const warranty = getWarrantyStatus(t);
          return (
            <Link key={t.id} href={`/tickets/view?id=${t.id}`}>
              <Card className="mb-2 hover:border-blue-300 transition-all">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-700">{t.trackingNumber}</span>
                      <span className="text-sm font-semibold text-slate-800">{t.brand} {t.model}</span>
                    </div>
                    {warranty.status !== "NONE" && (
                      <p className="text-xs text-slate-500 mt-1">{warranty.label}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                    {formatStatus(t.status)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </StaffLayout>
  );
}
