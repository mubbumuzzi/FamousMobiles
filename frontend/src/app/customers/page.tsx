"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, ChevronRight, UserPlus } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { Customer } from "@/lib/types";
import { formatCustomerMobiles } from "@/lib/utils";

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          {user?.role !== "TECHNICIAN" && <Button size="sm" onClick={() => { setShowForm(!showForm); setFormError(""); }}>Add Customer</Button>}
        </div>
        <Input placeholder="Search by name or mobile..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        {showForm && (
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Name *</Label>
                  {form.fullName.trim().length > 0 && form.fullName.trim().length < 4 && (
                    <span className="text-xs text-amber-600">Min 4 chars</span>
                  )}
                </div>
                <Input
                  placeholder="Min 4 characters"
                  minLength={4}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
                />
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              {formError && <p className="text-xs text-red-600 md:col-span-2">{formError}</p>}
              <Button onClick={create} className="md:col-span-2">Save Customer</Button>
            </CardContent>
          </Card>
        )}
        <div className="space-y-2.5">
          {customers.map((c) => {
            const cleanMobile = c.mobile ? c.mobile.replace(/\D/g, "").slice(-10) : "";
            const waText = encodeURIComponent(
              `Hello ${c.fullName}, contacting you from Famous Mobiles:`
            );
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/customers/view?id=${c.id}`)}
                className="group relative rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs hover:shadow-md touch-active active:scale-[0.98] cursor-pointer transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {c.fullName}
                    </p>
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                      {c.customerCode}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 font-medium">
                    {formatCustomerMobiles(c)}
                  </p>
                  {c.address && (
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                      {c.address}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* 1-Tap Direct Call & WhatsApp */}
                  {cleanMobile && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${cleanMobile}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 touch-active transition-all"
                        title={`Call ${c.fullName}`}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`https://wa.me/91${cleanMobile}?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 touch-active transition-all"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StaffLayout>
  );
}
