"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Smartphone } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { WizardSteps } from "@/components/ui/wizard-steps";
import { Input, Label, Textarea, Field, selectClassName } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEVICE_BRANDS } from "@/lib/device-brands";
import { ISSUE_TEMPLATES } from "@/lib/issue-templates";
import { useAuthGuard } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { ACCESSORIES, CONDITIONS, Customer, DeviceType, Ticket } from "@/lib/types";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";
import { SHOP } from "@/lib/shop";

const STEPS = ["Customer", "Device", "Issue", "Cost", "Preview"];
const emptyNewCustomer = { fullName: "", mobile: "", alternateMobile: "", address: "", city: "" };

export default function NewTicketPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthGuard();
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [repairHistory, setRepairHistory] = useState<Ticket[]>([]);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [mobileLookup, setMobileLookup] = useState("");
  const debouncedMobile = useDebounce(mobileLookup, 350);
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
    if (authLoading || !user) return;
    api<Customer[]>("/customers").then(setCustomers).catch(console.error);
  }, [authLoading, user]);

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

  useEffect(() => {
    if (!debouncedMobile || debouncedMobile.length < 6) return;
    const match = customers.find((c) => c.mobile.includes(debouncedMobile.replace(/\s/g, "")));
    if (match) setCustomerId(match.id);
  }, [debouncedMobile, customers]);

  const customerDisplay = useMemo(() => {
    if (selectedCustomer) return selectedCustomer;
    if (newCustomer.fullName || newCustomer.mobile) return { ...newCustomer, customerCode: "NEW" } as Customer;
    return null;
  }, [selectedCustomer, newCustomer]);

  const canNext = () => {
    if (step === 0) return Boolean(customerId || (newCustomer.fullName.trim() && newCustomer.mobile.trim()));
    if (step === 1) return Boolean(brand.trim() && model.trim());
    if (step === 2) return Boolean(problem.trim());
    return true;
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      let cid = customerId;
      if (!cid) {
        const c = await api<Customer>("/customers", { method: "POST", body: JSON.stringify(newCustomer) });
        cid = c.id;
      }
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
      <div className="mx-auto max-w-2xl animate-fade-in space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Repair</h1>
          <p className="text-sm text-slate-500">Fast intake — under 30 seconds</p>
        </div>

        <WizardSteps steps={STEPS} current={step} />

        <div className="premium-card p-5">
          {step === 0 && (
            <div className="space-y-4">
              <Field>
                <Label>Find by mobile</Label>
                <Input
                  type="tel"
                  placeholder="Enter mobile to auto-fill returning customer"
                  value={mobileLookup}
                  onChange={(e) => setMobileLookup(e.target.value)}
                />
              </Field>
              <Field>
                <Label>Existing Customer</Label>
                <select className={selectClassName} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">— Select or search above —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.mobile})</option>
                  ))}
                </select>
              </Field>
              {selectedCustomer && (
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="font-bold text-slate-900">{selectedCustomer.fullName}</p>
                  <p className="text-sm text-slate-600">{selectedCustomer.mobile} · {selectedCustomer.customerCode}</p>
                  {repairHistory.length > 0 && (
                    <p className="mt-2 text-xs text-blue-700">{repairHistory.length} past repair(s)</p>
                  )}
                </div>
              )}
              {!customerId && (
                <>
                  <p className="text-xs font-medium text-slate-500">Or new customer</p>
                  <Field><Label>Full Name *</Label><Input value={newCustomer.fullName} onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field><Label>Mobile *</Label><Input type="tel" value={newCustomer.mobile} onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })} /></Field>
                    <Field><Label>Alternate</Label><Input type="tel" value={newCustomer.alternateMobile} onChange={(e) => setNewCustomer({ ...newCustomer, alternateMobile: e.target.value })} /></Field>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <Label>Device Type</Label>
                <select className={selectClassName} value={deviceType} onChange={(e) => setDeviceType(e.target.value as DeviceType)}>
                  {["MOBILE", "TABLET", "SMART_WATCH", "LAPTOP", "OTHER"].map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </Field>
              <Field><Label>Brand *</Label><SearchableSelect placeholder="Search brand..." value={brand} onChange={setBrand} options={DEVICE_BRANDS} /></Field>
              <Field><Label>Model *</Label><Input placeholder="e.g. A14" value={model} onChange={(e) => setModel(e.target.value)} /></Field>
              <Field><Label>Color</Label><Input value={color} onChange={(e) => setColor(e.target.value)} /></Field>
              <Field><Label>IMEI</Label><Input value={imei} onChange={(e) => setImei(e.target.value)} /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field>
                <Label>Quick issue templates</Label>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_TEMPLATES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setProblem(t)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${problem === t ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field>
                <Label>Problem Description *</Label>
                <Textarea placeholder="Describe the issue" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} />
              </Field>
              <Field><Label>Accessories received</Label><ChipSelect options={ACCESSORIES} selected={accessories} onChange={setAccessories} /></Field>
              <Field><Label>Device condition</Label><ChipSelect options={CONDITIONS} selected={conditions} onChange={setConditions} /></Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field><Label>Estimated Cost (₹)</Label><Input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} /></Field>
              <Field><Label>Advance Paid (₹)</Label><Input type="number" value={advancePaid} onChange={(e) => setAdvancePaid(e.target.value)} /></Field>
              <Field><Label>Delivery Date</Label><Input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} /></Field>
              <p className="sm:col-span-3 text-sm text-slate-500">
                Balance: {formatCurrency(Math.max(0, Number(estimatedCost) - Number(advancePaid)))}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl gradient-hero p-4 text-white">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  <span className="font-bold">{SHOP.name}</span>
                </div>
                <p className="mt-2 text-lg font-bold">{brand} {model}</p>
                <p className="opacity-90">{customerDisplay?.fullName} · {customerDisplay?.mobile}</p>
              </div>
              <div className="grid gap-2 rounded-xl bg-slate-50 p-4">
                <Row label="Problem" value={problem} />
                <Row label="Estimated" value={formatCurrency(Number(estimatedCost))} />
                <Row label="Advance" value={formatCurrency(Number(advancePaid))} />
                <Row label="Delivery" value={edd ? formatDate(edd) : "—"} />
                {conditions.length > 0 && <Row label="Condition" value={conditions.join(", ")} />}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" size="lg" className="flex-1" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="lg" className="flex-1" disabled={loading} onClick={submit}>
              {loading ? "Creating..." : <><Check className="h-4 w-4" /> Create & Print Receipt</>}
            </Button>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}
