"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, ChevronRight, UserPlus, Search, X, MapPin, Calendar } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { Customer } from "@/lib/types";
import { formatCustomerMobiles } from "@/lib/utils";

function getCustomerInitials(name: string): string {
  if (!name) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatJoinedDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function CustomersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthGuard();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ fullName: "", mobile: "", alternateMobile: "", address: "" });
  const [showForm, setShowForm] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  const load = (q?: string) => api<Customer[]>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setCustomers);
  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    load(debouncedQuery || undefined);
  }, [debouncedQuery, authLoading, user]);

  useEffect(() => {
    const handleFmRefresh = () => {
      load(debouncedQuery || undefined);
    };
    window.addEventListener("fm:refresh", handleFmRefresh);
    return () => window.removeEventListener("fm:refresh", handleFmRefresh);
  }, [debouncedQuery]);

  const [formError, setFormError] = useState("");

  const create = async () => {
    setFormError("");
    if (form.fullName.trim().length < 4) {
      setFormError("Full name must be at least 4 characters");
      return;
    }
    if (form.mobile.trim().length !== 10) {
      setFormError("Mobile number must be exactly 10 digits");
      return;
    }
    try {
      await api("/customers", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ fullName: "", mobile: "", alternateMobile: "", address: "" });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save customer");
    }
  };

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 animate-fade-in text-[#121212]">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">Customers</h1>
            <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
              {query.trim()
                ? `Showing ${customers.length} results`
                : `${customers.length} registered customers`}
            </p>
          </div>
          {user?.role !== "TECHNICIAN" && (
            <Button
              variant="primary"
              size="sm"
              className="cursor-pointer gap-1.5 h-9"
              onClick={() => { setShowForm(!showForm); setFormError(""); }}
            >
              <UserPlus className="h-4 w-4" />
              <span>{showForm ? "Cancel" : "Add Customer"}</span>
            </Button>
          )}
        </div>

        {/* Polished Inset Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#767676] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name, mobile, or code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search customers"
            className="h-11 w-full rounded-[10px] border border-[#EBEBEB] bg-white pl-10 pr-9 text-xs text-[#121212] placeholder-[#767676] focus:border-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] shadow-2xs transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#767676] hover:text-[#121212] cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Add Customer Card */}
        {showForm && (
          <Card className="rounded-[12px] border border-[#EBEBEB] shadow-2xs">
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Name *</Label>
                  {form.fullName.trim().length > 0 && form.fullName.trim().length < 4 && (
                    <span className="text-xs text-[#B35300]">Min 4 chars</span>
                  )}
                </div>
                <Input
                  placeholder="Min 4 characters"
                  minLength={4}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="rounded-[10px] border-[#EBEBEB]"
                  required
                />
              </div>
              <div>
                <Label>Mobile *</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="rounded-[10px] border-[#EBEBEB]"
                  required
                />
              </div>
              <div>
                <Label>Alternate Mobile</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="10-digit alternate"
                  value={form.alternateMobile}
                  onChange={(e) => setForm({ ...form, alternateMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="rounded-[10px] border-[#EBEBEB]"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="rounded-[10px] border-[#EBEBEB]"
                  placeholder="Colony, street or landmark"
                />
              </div>
              {formError && <p className="text-xs text-[#C5221F] md:col-span-2">{formError}</p>}
              <Button variant="primary" onClick={create} className="md:col-span-2 cursor-pointer h-10">
                Save Customer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 2-Column Responsive Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {customers.map((c) => {
            const cleanMobile = c.mobile ? c.mobile.replace(/\D/g, "").slice(-10) : "";
            const waText = encodeURIComponent(
              `Hello ${c.fullName}, contacting you from Famous Mobiles:`
            );
            const initials = getCustomerInitials(c.fullName);
            const joinedDate = formatJoinedDate(c.createdAt);
            const validAddress =
              c.address &&
              c.address.trim().length >= 3 &&
              c.address.trim().toLowerCase() !== "www"
                ? c.address.trim()
                : null;

            return (
              <div
                key={c.id}
                onClick={() => router.push(`/customers/view?id=${c.id}`)}
                className="group relative flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-2xs hover:border-[#121212] hover:bg-[#F7F7F8] active:scale-[0.99] cursor-pointer transition-all min-h-[115px]"
              >
                <div className="flex items-start gap-3">
                  {/* 40px Neutral Monogram Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0F0F2] text-[13px] font-bold text-[#121212]">
                    {initials}
                  </div>

                  {/* Customer Core Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[14px] text-[#121212] truncate leading-tight">
                        {c.fullName}
                      </p>
                      <span className="shrink-0 rounded-[4px] bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#121212]">
                        {c.customerCode}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[#767676] font-medium">
                      {formatCustomerMobiles(c)}
                    </p>

                    {/* Labelled Address */}
                    {validAddress && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[#767676] truncate" title={validAddress}>
                        <MapPin className="h-3 w-3 shrink-0 text-[#767676]" />
                        <span className="truncate">{validAddress}</span>
                      </p>
                    )}
                  </div>

                  {/* 1-Tap Direct Call & WhatsApp Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {cleanMobile && (
                      <>
                        <a
                          href={`tel:${cleanMobile}`}
                          className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB] active:scale-95 transition-all"
                          title={`Call ${c.fullName}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/91${cleanMobile}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAF6EE] text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 transition-all"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </>
                    )}
                    <div className="flex h-8 w-5 items-center justify-center text-[#767676] group-hover:text-[#121212] group-hover:translate-x-0.5 transition-transform">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Joined Date & View History */}
                {joinedDate && (
                  <div className="mt-2.5 pt-2 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#767676]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#767676]" />
                      <span>Joined {joinedDate}</span>
                    </span>
                    <span className="text-[11px] font-medium text-[#121212] group-hover:underline">
                      View History →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {customers.length === 0 && (
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#121212]">No customers found</p>
            <p className="text-xs text-[#767676] mt-1">Try searching with a different name or mobile number.</p>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
