"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Smartphone, Wrench } from "lucide-react";
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
import {
  cleanMobileInput,
  isExact10DigitMobile,
  isValidCustomerFullName,
  findExactCustomerMatch,
  isCustomerMobileMatch,
  canProceedCustomerStep,
} from "@/lib/new-ticket-validation";

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
  const [selectedPastTicketId, setSelectedPastTicketId] = useState("");
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [mobile, setMobile] = useState("");
  const debouncedMobile = useDebounce(mobile, 350);
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
    setSelectedPastTicketId("");
    if (!customerId) {
      setSelectedCustomer(null);
      setRepairHistory([]);
      return;
    }
    setNewCustomer(emptyNewCustomer);
    api<Customer>(`/customers/${customerId}`)
      .then((c) => {
        setSelectedCustomer(c);
        if (c.mobile && !mobile) setMobile(c.mobile);
      })
      .catch(console.error);
    api<Ticket[]>(`/customers/${customerId}/repairs`).then(setRepairHistory).catch(console.error);
  }, [customerId]);

  const lookupCustomerIfExact = useCallback(
    (numberToLookup: string) => {
      const clean = numberToLookup.replace(/\s/g, "");
      if (!isExact10DigitMobile(clean)) return;

      const match = findExactCustomerMatch(customers, clean);
      if (match) {
        if (customerId !== match.id) {
          setCustomerId(match.id);
          setSelectedCustomer(match);
        }
      } else {
        api<Customer[]>(`/customers?q=${encodeURIComponent(clean)}`)
          .then((res) => {
            const exact = res ? findExactCustomerMatch(res, clean) : undefined;
            if (exact) {
              setCustomers((prev) => {
                const ids = new Set(prev.map((c) => c.id));
                return ids.has(exact.id) ? prev : [exact, ...prev];
              });
              setCustomerId(exact.id);
              setSelectedCustomer(exact);
            }
          })
          .catch(console.error);
      }
    },
    [customers, customerId]
  );

  useEffect(() => {
    const clean = (debouncedMobile || "").replace(/\s/g, "");
    const isCurrentCustomer = isCustomerMobileMatch(selectedCustomer, clean);

    if (clean.length !== 10) {
      if (customerId && !isCurrentCustomer) {
        setCustomerId("");
        setSelectedCustomer(null);
        setRepairHistory([]);
        setSelectedPastTicketId("");
      }
      return;
    }
    lookupCustomerIfExact(clean);
  }, [debouncedMobile, lookupCustomerIfExact, customerId, selectedCustomer]);

  const selectedPastTicket = useMemo(
    () => repairHistory.find((t) => t.id === selectedPastTicketId),
    [repairHistory, selectedPastTicketId]
  );

  const applyPastDevice = (ticket: Ticket) => {
    setSelectedPastTicketId(ticket.id);
    if (ticket.deviceType) setDeviceType(ticket.deviceType);
    setBrand(ticket.brand || "");
    setModel(ticket.model || "");
    setColor(ticket.color || "");
    setImei(ticket.imei || "");
  };

  const applyPastDeviceAndJump = (ticket: Ticket) => {
    applyPastDevice(ticket);
    // Skips Customer (step 0) and Device (step 1), jumping directly to Issue (step 2)
    setStep(2);
  };

  const handlePastDeviceDropdown = (ticketId: string) => {
    setSelectedPastTicketId(ticketId);
    if (!ticketId) return;
    const ticket = repairHistory.find((t) => t.id === ticketId);
    if (ticket) {
      applyPastDevice(ticket);
    }
  };

  const customerDisplay = useMemo(() => {
    if (selectedCustomer) return selectedCustomer;
    if (newCustomer.fullName || mobile) return { ...newCustomer, mobile, customerCode: "NEW" } as Customer;
    return null;
  }, [selectedCustomer, newCustomer, mobile]);

  const canNext = () => {
    if (step === 0) {
      return canProceedCustomerStep(customerId, mobile, newCustomer.fullName);
    }
    if (step === 1) return Boolean(brand.trim() && model.trim());
    if (step === 2) return Boolean(problem.trim());
    return true;
  };

  const handleNext = () => {
    if (step === 0 && selectedPastTicketId && brand.trim() && model.trim()) {
      // Both Customer and Device are selected from previous repair history: skip Step 1 and go straight to Step 2
      setStep(2);
    } else {
      setStep((s) => s + 1);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      let cid = customerId;
      if (!cid) {
        if (!isExact10DigitMobile(mobile)) {
          setError("Mobile number must be exactly 10 digits");
          setLoading(false);
          return;
        }
        if (!isValidCustomerFullName(newCustomer.fullName)) {
          setError("Full name must be at least 4 characters");
          setLoading(false);
          return;
        }
        const c = await api<Customer>("/customers", {
          method: "POST",
          body: JSON.stringify({ ...newCustomer, mobile: mobile.trim() }),
        });
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
                <div className="flex items-center justify-between">
                  <Label>Mobile Number *</Label>
                  <span
                    className={`text-xs font-semibold ${
                      mobile.length === 10 ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {mobile.length}/10 digits
                  </span>
                </div>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => {
                    const digits = cleanMobileInput(e.target.value);
                    setMobile(digits);
                    if (customerId && !isCustomerMobileMatch(selectedCustomer, digits)) {
                      setCustomerId("");
                      setSelectedCustomer(null);
                      setRepairHistory([]);
                      setSelectedPastTicketId("");
                    }
                  }}
                  onBlur={() => {
                    if (isExact10DigitMobile(mobile)) {
                      lookupCustomerIfExact(mobile);
                    }
                  }}
                  className="h-12 text-base font-medium tracking-wide"
                  autoFocus
                />
              </Field>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Or select from existing customer directory</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 max-w-[220px] truncate"
                  value={customerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCustomerId(id);
                    if (!id) {
                      setMobile("");
                      setSelectedCustomer(null);
                      setRepairHistory([]);
                      setSelectedPastTicketId("");
                    } else {
                      const found = customers.find((c) => c.id === id);
                      if (found) {
                        setSelectedCustomer(found);
                        setMobile(found.mobile);
                      }
                    }
                  }}
                >
                  <option value="">— Customer directory —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.mobile})
                    </option>
                  ))}
                </select>
              </div>
              {selectedCustomer && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">{selectedCustomer.fullName}</p>
                      <Badge variant="default" className="bg-white border border-slate-200">{selectedCustomer.customerCode}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{selectedCustomer.mobile}</p>
                    {repairHistory.length > 0 && (
                      <p className="mt-2 text-xs font-semibold text-blue-700">
                        {repairHistory.length} previous repair(s) found in system
                      </p>
                    )}
                  </div>

                  {repairHistory.length > 0 && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
                          <Wrench className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-violet-950">
                            Re-repair Previously Repaired Device
                          </h3>
                          <p className="text-xs text-violet-700">
                            Select the phone to auto-fill device details and skip straight to Problem Description.
                          </p>
                        </div>
                      </div>

                      <Field>
                        <Label className="text-xs font-semibold text-violet-900">
                          Select from previously repaired mobiles
                        </Label>
                        <select
                          className={selectClassName}
                          value={selectedPastTicketId}
                          onChange={(e) => handlePastDeviceDropdown(e.target.value)}
                        >
                          <option value="">— Choose a device to re-repair —</option>
                          {repairHistory.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.brand} {t.model} {t.color ? `(${t.color})` : ""} {t.imei ? `· IMEI: ${t.imei}` : ""} [Prev: {t.trackingNumber} - {formatDate(t.createdAt)}]
                            </option>
                          ))}
                        </select>
                      </Field>

                      {selectedPastTicket && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 border border-violet-300 shadow-sm">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                              <p className="text-sm font-bold text-slate-900">
                                {selectedPastTicket.brand} {selectedPastTicket.model}
                                {selectedPastTicket.color && (
                                  <span className="ml-1 text-xs font-normal text-slate-500">
                                    ({selectedPastTicket.color})
                                  </span>
                                )}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Previous Ticket: {selectedPastTicket.trackingNumber} · Repaired: {formatDate(selectedPastTicket.createdAt)}
                              {selectedPastTicket.imei ? ` · IMEI: ${selectedPastTicket.imei}` : ""}
                            </p>
                            {selectedPastTicket.problemDescription && (
                              <p className="text-xs text-slate-600 italic mt-0.5">
                                Previous Issue: &ldquo;{selectedPastTicket.problemDescription}&rdquo;
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applyPastDeviceAndJump(selectedPastTicket)}
                            className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                          >
                            Re-repair this device (Skip to Issue) <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-800">
                          Or 1-click select past device:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {repairHistory.slice(0, 4).map((t) => {
                            const isSelected = selectedPastTicketId === t.id;
                            return (
                              <div
                                key={t.id}
                                className={`rounded-xl border p-3 transition-all ${
                                  isSelected
                                    ? "border-violet-600 bg-white ring-2 ring-violet-400 shadow-sm"
                                    : "border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <p className="font-semibold text-slate-900 text-sm">
                                    {t.brand} {t.model}
                                  </p>
                                  <Badge variant="default" className="text-[10px]">
                                    {formatStatus(t.status)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {t.trackingNumber} · {formatDate(t.createdAt)}
                                </p>
                                {t.imei && <p className="text-[11px] text-slate-400">IMEI: {t.imei}</p>}
                                {t.problemDescription && (
                                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                                    Prev: {t.problemDescription}
                                  </p>
                                )}
                                <div className="mt-2.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    className={`w-full text-xs ${
                                      isSelected
                                        ? "bg-violet-600 text-white"
                                        : "border-violet-300 text-violet-700 hover:bg-violet-50"
                                    }`}
                                    onClick={() => applyPastDeviceAndJump(t)}
                                  >
                                    Re-repair this device <ArrowRight className="ml-1 h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <p className="text-[11px] text-violet-700/80 italic">
                        Tip: If the customer brought a different/new device, simply click &quot;Next&quot; below without selecting a past device.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!customerId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      New Customer Details
                    </p>
                    {mobile.length === 10 ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Mobile: {mobile}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Enter 10-digit mobile above
                      </span>
                    )}
                  </div>

                  <Field>
                    <div className="flex items-center justify-between">
                      <Label>Full Name *</Label>
                      {newCustomer.fullName.trim().length > 0 && newCustomer.fullName.trim().length < 4 && (
                        <span className="text-xs text-amber-600 font-medium">
                          Min 4 characters ({newCustomer.fullName.trim().length}/4)
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder="Enter customer full name (min 4 characters)"
                      minLength={4}
                      value={newCustomer.fullName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <Label>Alternate Mobile (Optional)</Label>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="10-digit alternate mobile"
                        value={newCustomer.alternateMobile}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            alternateMobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <Label>City / Area (Optional)</Label>
                      <Input
                        placeholder="e.g. Manikonda, Hyderabad"
                        value={newCustomer.city}
                        onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedPastTicketId && (
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-violet-50 p-3 border border-violet-200 text-sm">
                  <div className="flex items-center gap-2 text-violet-900">
                    <Wrench className="h-4 w-4 text-violet-600" />
                    <span>
                      Device pre-filled from past repair <strong>{selectedPastTicket?.trackingNumber}</strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-violet-700 hover:text-violet-900"
                    onClick={() => {
                      setSelectedPastTicketId("");
                      setBrand("");
                      setModel("");
                      setColor("");
                      setImei("");
                    }}
                  >
                    Clear / New Device
                  </Button>
                </div>
              )}
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
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200 text-sm">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">{brand} {model}</span>
                  {color && <span className="text-xs text-slate-500">({color})</span>}
                  {imei && <span className="text-xs text-slate-500">· IMEI: {imei}</span>}
                  {selectedPastTicketId && (
                    <Badge variant="default" className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200">
                      Re-repair
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Edit device details
                </button>
              </div>

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
            <Button type="button" size="lg" className="flex-1" disabled={!canNext()} onClick={handleNext}>
              {step === 0 && selectedPastTicketId ? (
                <>Skip to Issue <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Next <ArrowRight className="h-4 w-4" /></>
              )}
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
