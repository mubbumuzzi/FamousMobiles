"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Customer, Ticket, AccessorySale } from "@/lib/types";
import { formatStatus, formatCustomerMobiles, getVipStatus, getWarrantyStatus, formatCurrency, cn } from "@/lib/utils";
import { RotateCcw, ArrowLeft, Wrench, ShieldCheck, Printer, MessageCircle, ShoppingBag } from "lucide-react";
import { computeWarrantyStatus } from "@/components/stock/AccessorySalesTracker";
import { printAccessoryWarrantyBill } from "@/lib/print";

export default function CustomerDetailClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = params?.id || searchParams.get("id");
  const id = rawId && rawId !== "view" ? rawId : searchParams.get("id") || "";

  const { user, loading: authLoading } = useAuthGuard();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [repairs, setRepairs] = useState<Ticket[]>([]);
  const [accessories, setAccessories] = useState<AccessorySale[]>([]);
  const [activeTab, setActiveTab] = useState<"REPAIRS" | "ACCESSORIES">("REPAIRS");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    api<Customer>(`/customers/${id}`).then(setCustomer).catch(() => {});
    api<Ticket[]>(`/customers/${id}/repairs`).then(setRepairs).catch(() => {});
    api<AccessorySale[]>(`/accessory-sales/customer/${id}`).then((res) => setAccessories(res || [])).catch(() => {});
  }, [id, authLoading, user]);

  if (authLoading || !customer) return null;

  const vip = getVipStatus(repairs.length + accessories.length);

  const handlePrintAccessory = async (sale: AccessorySale, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoadingId(`print-${sale.id}`);
    try {
      await printAccessoryWarrantyBill(sale.id, sale.billNumber);
    } catch (err: any) {
      alert("Failed to print bill: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWhatsAppAccessory = (sale: AccessorySale, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clean = (sale.customerMobile || "").replace(/\D/g, "");
    if (clean.length < 10) {
      alert("No valid 10-digit customer mobile on record.");
      return;
    }
    const phone = clean.length === 10 ? `91${clean}` : clean;
    const isWarranty = sale.warrantyMonths > 0;
    const header = isWarranty
      ? "*Famous Mobiles - Official Warranty Bill*"
      : "*Famous Mobiles - Sale Receipt*";

    let warrantyLine = "";
    if (isWarranty && sale.warrantyExpiresAt) {
      warrantyLine = `\n*Warranty:* ${sale.warrantyMonths} Months (Valid till ${sale.warrantyExpiresAt})`;
    }

    const serialLine = sale.serialNumber ? `\n*Serial/IMEI:* ${sale.serialNumber}` : "";
    const msg = `${header}\n\nHello ${sale.customerName},\nThank you for purchasing at *Famous Mobiles*!\n\n📋 *Bill No:* ${sale.billNumber}\n*Item:* ${sale.accessoryName}\n*Amount Paid:* ${formatCurrency(sale.price)} (${sale.paymentMode})${warrantyLine}${serialLine}\n\n📍 *Famous Mobiles*\nOpp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.\n📞 Store Contact: +91 90637 86751`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

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

        {/* Tab Switcher: Repairs vs Accessories */}
        <div className="flex items-center gap-1.5 rounded-[10px] bg-[#F0F0F2] p-1 border border-[#EBEBEB] w-full sm:w-fit mt-3">
          <button
            type="button"
            onClick={() => setActiveTab("REPAIRS")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "REPAIRS"
                ? "bg-white text-[#121212] shadow-2xs"
                : "text-[#767676] hover:text-[#121212]"
            )}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Repair History ({repairs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ACCESSORIES")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "ACCESSORIES"
                ? "bg-white text-[#121212] shadow-2xs"
                : "text-[#767676] hover:text-[#121212]"
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-[#0E8345]" />
            <span>Accessories & Warranties ({accessories.length})</span>
          </button>
        </div>

        {/* Tab 1: Repair History */}
        {activeTab === "REPAIRS" && (
          <div className="space-y-2 pt-1">
            {repairs.length === 0 ? (
              <p className="text-xs text-[#767676] py-4 text-center bg-white rounded-[10px] border border-[#EBEBEB]">
                No repair tickets found for this customer.
              </p>
            ) : (
              repairs.map((t) => {
                const warranty = getWarrantyStatus(t);
                return (
                  <Link key={t.id} href={`/tickets/view?id=${t.id}`}>
                    <Card className="rounded-[12px] border border-[#EBEBEB] bg-white hover:border-[#121212] transition-colors shadow-2xs">
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
              })
            )}
          </div>
        )}

        {/* Tab 2: Accessories & Warranties */}
        {activeTab === "ACCESSORIES" && (
          <div className="space-y-2.5 pt-1">
            {accessories.length === 0 ? (
              <p className="text-xs text-[#767676] py-6 text-center bg-white rounded-[10px] border border-[#EBEBEB]">
                No accessory purchases or warranty bills on file for this customer.
              </p>
            ) : (
              accessories.map((sale) => {
                const status = computeWarrantyStatus(sale);
                const Icon = status.icon;
                return (
                  <Card key={sale.id} className="rounded-[12px] border border-[#EBEBEB] bg-white shadow-2xs">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#121212] text-sm">
                              {sale.accessoryName} {sale.quantity && sale.quantity > 1 ? `× ${sale.quantity}` : ""}
                            </span>
                            <span className="font-mono text-xs text-[#767676]">
                              #{sale.billNumber}
                            </span>
                          </div>
                          <p className="text-xs text-[#767676] mt-0.5">
                            Purchased: {new Date(sale.soldAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {formatCurrency(sale.price)} ({sale.paymentMode})
                          </p>
                        </div>

                        {/* Warranty Status Pill */}
                        <div className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border", status.badgeClass)}>
                          <Icon className="h-3 w-3" />
                          <span>{status.label}</span>
                        </div>
                      </div>

                      {/* Serial / Notes */}
                      {sale.serialNumber && (
                        <p className="text-[11px] font-mono text-[#767676]">
                          Serial: {sale.serialNumber}
                        </p>
                      )}

                      {/* Quick Print & Share Actions */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F0F0F2]">
                        <button
                          type="button"
                          onClick={(e) => handleWhatsAppAccessory(sale, e)}
                          className="flex items-center gap-1 rounded-[6px] border border-[#25D366]/30 bg-[#25D366]/10 px-2.5 py-1 text-[11px] font-bold text-[#075E54] hover:bg-[#25D366]/20 transition-all cursor-pointer"
                        >
                          <MessageCircle className="h-3 w-3 text-[#25D366]" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === `print-${sale.id}`}
                          onClick={(e) => handlePrintAccessory(sale, e)}
                          className="flex items-center gap-1 rounded-[6px] bg-[#121212] text-white px-3 py-1 text-[11px] font-bold hover:bg-black transition-all cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print Bill</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
