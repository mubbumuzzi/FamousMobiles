"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        <div className="space-y-2">
          {customers.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{c.fullName}</p>
                  <p className="text-sm text-slate-600">{formatCustomerMobiles(c)}</p>
                  <p className="text-xs text-slate-500">{c.customerCode}</p>
                </div>
                <Link href={`/customers/view?id=${c.id}`} className="text-sm text-blue-600">History</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
}
