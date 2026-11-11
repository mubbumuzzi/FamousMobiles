"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Customer, Ticket } from "@/lib/types";
import { formatStatus, formatCustomerMobiles, getVipStatus, getWarrantyStatus, cn } from "@/lib/utils";
import { RotateCcw, ArrowLeft } from "lucide-react";

export default function CustomerDetailClient() {
  const router = useRouter();
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
      <div className="space-y-4 max-w-2xl animate-fade-in text-[#121212]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/customers");
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#767676] hover:text-[#121212] bg-white hover:bg-[#F0F0F2] border border-[#EBEBEB] px-3 py-1.5 rounded-[8px] transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[20px] font-bold text-[#121212] tracking-tight">{customer.fullName}</h1>
          {vip.isRepeat && (
            <span className={cn("text-[11px] px-2.5 py-0.5 rounded-[6px] border font-semibold", vip.badgeClass)}>
              {vip.label}
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#767676]">{formatCustomerMobiles(customer)} · {customer.customerCode}</p>
        <h2 className="text-[14px] font-bold text-[#121212] pt-2">Repair History ({repairs.length})</h2>
        {repairs.map((t) => {
          const warranty = getWarrantyStatus(t);
          return (
            <Link key={t.id} href={`/tickets/view?id=${t.id}`}>
              <Card className="mb-2 rounded-[12px] border border-[#EBEBEB] bg-white hover:border-[#121212] transition-colors shadow-2xs">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#121212] font-mono text-[13px]">{t.trackingNumber}</span>
                      <span className="text-[13px] font-semibold text-[#121212]">{t.brand} {t.model}</span>
                      {t.reopenCount && t.reopenCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FEF7E0] px-2 py-0.5 text-[10px] font-bold text-[#B35300] border border-[#B35300]/20">
                          <RotateCcw className="h-2.5 w-2.5" /> Re-Check
                        </span>
                      ) : null}
                    </div>
                    {warranty.status !== "NONE" && (
                      <p className="text-[11px] text-[#767676] mt-1">{warranty.label}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#121212] bg-[#F0F0F2] px-2.5 py-1 rounded-[6px]">
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
