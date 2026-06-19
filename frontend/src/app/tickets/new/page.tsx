"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Field, selectClassName } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEVICE_BRANDS } from "@/lib/device-brands";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ACCESSORIES, CONDITIONS, Customer, DeviceType, Ticket } from "@/lib/types";
import { formatDate, formatStatus } from "@/lib/utils";

const emptyNewCustomer = { fullName: "", mobile: "", alternateMobile: "", address: "", city: "" };

export default function NewTicketPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthGuard();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [repairHistory, setRepairHistory] = useState<Ticket[]>([]);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [deviceType, setDeviceType] = useState<DeviceType>("MOBILE");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [imei, setImei] = useState("");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [problem, setProblem] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("0");
  const [advancePaid, setAdvancePaid] = useState("0");
  const [edd, setEdd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Customer[]>("/customers").then(setCustomers).catch(console.error);
  }, []);

  useEffect(() => {
    if (!customerId) {
      setSelectedCustomer(null);
      setRepairHistory([]);
      return;
    }
    setNewCustomer(emptyNewCustomer);
    api<Customer>(`/customers/${customerId}`).then(setSelectedCustomer).catch(console.error);
    api<Ticket[]>(`/customers/${customerId}/repairs`).then(setRepairHistory).catch(console.error);
  }, [customerId]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const onNewCustomerChange = (updates: Partial<typeof newCustomer>) => {
    setCustomerId("");
    setSelectedCustomer(null);
    setRepairHistory([]);
    setNewCustomer((prev) => ({ ...prev, ...updates }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let cid = customerId;
      if (!cid) {
        if (!newCustomer.fullName.trim()) throw new Error("Customer name is required");
        if (!newCustomer.mobile.trim()) throw new Error("Mobile number is required");
        const c = await api<Customer>("/customers", { method: "POST", body: JSON.stringify(newCustomer) });
        cid = c.id;
      }
      if (!cid) throw new Error("Select an existing customer or enter new customer details");
      const ticket = await api<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          customerId: cid,
          deviceType,
          brand,
          model,
          color,
          imei,
          accessoriesReceived: accessories,
          deviceCondition: conditions,
          problemDescription: problem,
          estimatedCost: Number(estimatedCost),
          advancePaid: Number(advancePaid),
          estimatedDeliveryDate: edd || null,
        }),
      });
      router.push(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">New Repair Ticket</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <Label>Existing Customer</Label>
              <select
                className={selectClassName}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- Select returning customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.mobile}{c.alternateMobile ? ` / ${c.alternateMobile}` : ""})
                  </option>
                ))}
              </select>
            </Field>

            {selectedCustomer && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
                <p className="font-semibold text-slate-900">{selectedCustomer.fullName}</p>
                <div className="grid gap-1 text-sm text-slate-700 md:grid-cols-2">
                  <p><span className="font-medium">Mobile:</span> {selectedCustomer.mobile}</p>
                  {selectedCustomer.alternateMobile && (
                    <p><span className="font-medium">Alternate:</span> {selectedCustomer.alternateMobile}</p>
                  )}
                  {selectedCustomer.city && <p><span className="font-medium">City:</span> {selectedCustomer.city}</p>}
                  {selectedCustomer.address && <p className="md:col-span-2"><span className="font-medium">Address:</span> {selectedCustomer.address}</p>}
                  <p><span className="font-medium">Customer ID:</span> {selectedCustomer.customerCode}</p>
                </div>

                {repairHistory.length > 0 && (
                  <div className="pt-2">
                    <p className="mb-2 text-sm font-medium text-slate-900">Past Repairs ({repairHistory.length})</p>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {repairHistory.map((t) => (
                        <Link
                          key={t.id}
                          href={`/tickets/${t.id}`}
                          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-blue-300"
                        >
                          <div>
                            <p className="font-medium text-blue-700">{t.trackingNumber}</p>
                            <p className="text-slate-600">{t.brand} {t.model} · {formatDate(t.createdAt)}</p>
                          </div>
                          <Badge>{formatStatus(t.status)}</Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {repairHistory.length === 0 && (
                  <p className="text-sm text-slate-600">No previous repairs for this customer.</p>
                )}
              </div>
            )}

            {!customerId && (
              <>
                <p className="text-xs text-slate-500">Or create new customer:</p>
                <Field>
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter full name"
                    value={newCustomer.fullName}
                    onChange={(e) => onNewCustomerChange({ fullName: e.target.value })}
                    required
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <Label>Mobile Number *</Label>
                    <Input
                      type="tel"
                      placeholder="Primary mobile (required)"
                      value={newCustomer.mobile}
                      onChange={(e) => onNewCustomerChange({ mobile: e.target.value })}
                      required
                    />
                  </Field>
                  <Field>
                    <Label>Alternate Mobile</Label>
                    <Input
                      type="tel"
                      placeholder="Optional second number"
                      value={newCustomer.alternateMobile}
                      onChange={(e) => onNewCustomerChange({ alternateMobile: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <Label>City</Label>
                    <Input
                      placeholder="City"
                      value={newCustomer.city}
                      onChange={(e) => onNewCustomerChange({ city: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <Label>Address</Label>
                    <Input
                      placeholder="Address"
                      value={newCustomer.address}
                      onChange={(e) => onNewCustomerChange({ address: e.target.value })}
                    />
                  </Field>
                </div>
                <p className="text-xs text-slate-500">* At least one mobile number is required.</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Device Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field>
              <Label>Device Type</Label>
              <select className={selectClassName} value={deviceType} onChange={(e) => setDeviceType(e.target.value as DeviceType)}>
                {["MOBILE", "TABLET", "SMART_WATCH", "LAPTOP", "OTHER"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Field>
              <Label>Brand</Label>
              <SearchableSelect
                placeholder="Search brand..."
                value={brand}
                onChange={setBrand}
                options={DEVICE_BRANDS}
              />
            </Field>
            <Field>
              <Label>Model</Label>
              <Input placeholder="Enter model" value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
            <Field>
              <Label>Color</Label>
              <Input placeholder="Enter color" value={color} onChange={(e) => setColor(e.target.value)} />
            </Field>
            <Field className="md:col-span-2">
              <Label>IMEI</Label>
              <Input placeholder="Enter IMEI" value={imei} onChange={(e) => setImei(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Accessories & Condition</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ACCESSORIES.map((a) => (
                <button key={a} type="button" onClick={() => toggle(accessories, setAccessories, a)}
                  className={`rounded-full px-3 py-1 text-xs ${accessories.includes(a) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>{a}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button key={c} type="button" onClick={() => toggle(conditions, setConditions, c)}
                  className={`rounded-full px-3 py-1 text-xs ${conditions.includes(c) ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>{c}</button>
              ))}
            </div>
            <Field>
              <Label>Problem Description</Label>
              <Textarea placeholder="Describe the issue" value={problem} onChange={(e) => setProblem(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment & Delivery</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field>
              <Label>Estimated Cost</Label>
              <Input type="number" placeholder="0" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
            </Field>
            <Field>
              <Label>Advance Paid</Label>
              <Input type="number" placeholder="0" value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} />
            </Field>
            <Field>
              <Label>Delivery Date</Label>
              <Input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create Ticket"}</Button>
      </form>
    </StaffLayout>
  );
}
