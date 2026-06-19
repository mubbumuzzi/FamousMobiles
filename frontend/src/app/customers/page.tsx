"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ fullName: "", mobile: "", alternateMobile: "", address: "" });
  const [showForm, setShowForm] = useState(false);

  const load = (q?: string) => api<Customer[]>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setCustomers);
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.fullName.trim() || !form.mobile.trim()) return;
    await api("/customers", { method: "POST", body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ fullName: "", mobile: "", alternateMobile: "", address: "" });
    load();
  };

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          {user?.role !== "TECHNICIAN" && <Button size="sm" onClick={() => setShowForm(!showForm)}>Add Customer</Button>}
        </div>
        <Input placeholder="Search by name or mobile..." value={query} onChange={(e) => { setQuery(e.target.value); load(e.target.value); }} />
        {showForm && (
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <div><Label>Name *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
              <div><Label>Mobile *</Label><Input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></div>
              <div><Label>Alternate Mobile</Label><Input type="tel" value={form.alternateMobile} onChange={(e) => setForm({ ...form, alternateMobile: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
                  <p className="text-sm text-slate-600">{c.mobile}{c.alternateMobile ? ` · Alt: ${c.alternateMobile}` : ""}</p>
                  <p className="text-xs text-slate-500">{c.customerCode}</p>
                </div>
                <Link href={`/customers/${c.id}`} className="text-sm text-blue-600">History</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
}
