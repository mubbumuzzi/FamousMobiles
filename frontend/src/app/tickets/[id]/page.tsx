"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Calendar, CheckCircle2, Download, MessageCircle, Pencil, Phone, Printer, User, Wrench } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { StatusProgress } from "@/components/tracking/StatusProgress";
import { ActivityTimeline } from "@/components/tracking/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, selectClassName } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Payment, REPAIR_STATUSES, RepairStatus, Technician, Ticket, TimelineEntry } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, formatStatus, formatCustomerMobiles, getWarrantyStatus, cn } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { SHOP } from "@/lib/shop";
import { downloadTicketReceipt, printTicketReceipt } from "@/lib/print";
import { Alert } from "@/components/ui/alert";
import { PageLoading } from "@/components/ui/skeleton";

const WARRANTY_OPTIONS = [
  { days: 0, label: "No Warranty (0d)" },
  { days: 15, label: "15 Days" },
  { days: 30, label: "30 Days (Standard)" },
  { days: 60, label: "60 Days" },
  { days: 90, label: "90 Days" },
  { days: 180, label: "6 Months (180d)" },
  { days: 365, label: "1 Year" },
];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuthGuard();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<RepairStatus | "">("");
  const [justUpdatedStatus, setJustUpdatedStatus] = useState<RepairStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignId, setAssignId] = useState("");
  const [paymentWarning, setPaymentWarning] = useState("");
  const [highlightPayment, setHighlightPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");
  const [cancelReason, setCancelReason] = useState("Customer changed mind / Cancelled");
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [newEstimateCost, setNewEstimateCost] = useState("");
  const [newEstimateRemarks, setNewEstimateRemarks] = useState("");
  const [newEstimateWarrantyDays, setNewEstimateWarrantyDays] = useState<number>(30);
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [approvalEstimateCost, setApprovalEstimateCost] = useState("");
  const [approvalWarrantyDays, setApprovalWarrantyDays] = useState<number>(30);

  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const payAmountInputRef = useRef<HTMLInputElement>(null);
  const estimateSectionRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    setLoadError("");
    Promise.all([
      api<Ticket>(`/tickets/${id}`),
      api<TimelineEntry[]>(`/tickets/${id}/timeline`),
      api<Payment[]>(`/tickets/${id}/payments`),
    ])
      .then(([t, tl, p]) => { setTicket(t); setTimeline(tl); setPayments(p); })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load ticket"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [id, authLoading, user]);

  useEffect(() => {
    if (user?.role === "ADMIN") api<Technician[]>("/technicians").then(setTechnicians).catch(console.error);
  }, [user?.role]);

  const scrollToPaymentSection = (fillAmount = true) => {
    if (fillAmount && ticket) {
      const balance = Number(ticket.balanceAmount || 0);
      if (balance > 0 && (!payAmount || Number(payAmount) <= 0)) {
        setPayAmount(String(balance));
      }
    }
    setHighlightPayment(true);
    paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      payAmountInputRef.current?.focus();
      payAmountInputRef.current?.select();
    }, 450);
    setTimeout(() => {
      setHighlightPayment(false);
    }, 4000);
  };

  const saveEstimation = async () => {
    const cost = Number(newEstimateCost);
    if (isNaN(cost) || cost < 0) {
      alert("Please enter a valid estimated cost (₹)");
      return;
    }
    const currentAdvance = Number(ticket?.advancePaid ?? 0);
    if (cost < currentAdvance) {
      alert(`Estimated cost cannot be less than advance already paid (${formatCurrency(currentAdvance)}).`);
      return;
    }
    setSavingEstimate(true);
    try {
      await api(`/tickets/${id}/estimation`, {
        method: "PATCH",
        body: JSON.stringify({
          estimatedCost: cost,
          remarks: newEstimateRemarks.trim() || undefined,
          warrantyDays: newEstimateWarrantyDays,
        }),
      });
      setEditingEstimate(false);
      setNewEstimateCost("");
      setNewEstimateRemarks("");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update estimation");
    } finally {
      setSavingEstimate(false);
    }
  };

  const quickUpdateStatus = async (targetStatus: RepairStatus) => {
    const balance = Number(ticket?.balanceAmount ?? 0);
    if (targetStatus === "DELIVERED" && balance > 0) {
      setPaymentWarning(
        `Payment is pending! ${formatCurrency(balance)} balance remains. Please record the payment before marking as Delivered.`
      );
      scrollToPaymentSection(true);
      return;
    }
    setPaymentWarning("");
    try {
      await api(`/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: targetStatus,
          remarks: `Updated on bench to ${formatStatus(targetStatus)}`,
          technicianNotes: `Updated on bench to ${formatStatus(targetStatus)}`,
        }),
      });
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(25); } catch (_) {}
      }
      setJustUpdatedStatus(targetStatus);
      load();
    } catch (err) {
      setPaymentWarning(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const updateStatus = async () => {
    if (!nextStatus) return;
    const targetStatus = nextStatus;
    const balance = Number(ticket?.balanceAmount ?? 0);

    // Guard: delivered status requires full payment
    if (targetStatus === "DELIVERED" && balance > 0) {
      setPaymentWarning(
        `Payment is pending! ${formatCurrency(balance)} balance remains. Please record the payment before marking this ticket as Delivered.`
      );
      scrollToPaymentSection(true);
      return;
    }

    setPaymentWarning("");
    try {
      if (targetStatus === "WAITING_FOR_APPROVAL" && approvalEstimateCost.trim()) {
        const cost = Number(approvalEstimateCost);
        const currentAdvance = Number(ticket?.advancePaid ?? 0);
        if (!isNaN(cost) && cost < currentAdvance) {
          setPaymentWarning(`Estimated cost cannot be less than advance already paid (${formatCurrency(currentAdvance)}).`);
          return;
        }
        if (!isNaN(cost) && cost >= 0) {
          await api(`/tickets/${id}/estimation`, {
            method: "PATCH",
            body: JSON.stringify({
              estimatedCost: cost,
              remarks: "Estimate determined for customer approval",
              warrantyDays: approvalWarrantyDays,
            }),
          });
        }
      }

      const finalRemarks =
        targetStatus === "RETURNED_UNREPAIRED"
          ? `${cancelReason}${remarks.trim() ? " · " + remarks.trim() : ""}`
          : remarks;

      await api(`/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, remarks: finalRemarks, technicianNotes: finalRemarks }),
      });
      setNextStatus("");
      setRemarks("");
      setApprovalEstimateCost("");
      setJustUpdatedStatus(targetStatus);
      load();
    } catch (err) {
      setPaymentWarning(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api(`/tickets/${id}/notes`, { method: "POST", body: JSON.stringify({ content: note }) });
    setNote(""); load();
  };

  const recordPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    const currentBalance = Number(ticket?.balanceAmount ?? 0);
    if (amount > currentBalance) {
      alert(`Payment amount (${formatCurrency(amount)}) cannot exceed remaining balance of ${formatCurrency(currentBalance)}.`);
      return;
    }
    try {
      await api(`/tickets/${id}/payments`, { method: "POST", body: JSON.stringify({ amount, paymentMode: payMode }) });
      setPayAmount("");
      setPaymentWarning("");
      const currentBalance = Number(ticket?.balanceAmount ?? 0);
      const remaining = Math.max(0, currentBalance - amount);
      if (remaining === 0) {
        setPaymentSuccessMsg(`Payment of ${formatCurrency(amount)} recorded! Balance cleared. You can now mark as Delivered.`);
        setNextStatus("DELIVERED");
      } else {
        setPaymentSuccessMsg(`Payment of ${formatCurrency(amount)} recorded. Remaining balance: ${formatCurrency(remaining)}.`);
      }
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record payment");
    }
  };

  const assignSelf = async () => { await api(`/tickets/${id}/assign-me`, { method: "POST" }); load(); };
  const assignTechnician = async () => {
    if (!assignId) return;
    await api(`/tickets/${id}/assign`, { method: "POST", body: JSON.stringify({ technicianId: assignId }) });
    setAssignId(""); load();
  };

  const downloadReceipt = async () => {
    if (!id || !ticket) return;
    await downloadTicketReceipt(id, ticket.trackingNumber);
  };

  const printReceipt = async () => {
    if (!id) return;
    await printTicketReceipt(id);
  };

  const openWhatsApp = (templateType: "auto" | "pickup" | "estimate" | "general" = "auto") => {
    if (!ticket) return;
    const cleanMobile = ticket.customer.mobile.replace(/\D/g, "");
    const phoneWithCountry = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const trackUrl = `${origin}/track/${ticket.trackingNumber}`;

    let resolvedType = templateType;
    if (resolvedType === "auto") {
      if (ticket.status === "READY_FOR_PICKUP") resolvedType = "pickup";
      else if (ticket.status === "WAITING_FOR_APPROVAL") resolvedType = "estimate";
      else resolvedType = "general";
    }

    let text = "";
    const wDays = ticket.warrantyDays ?? 0;
    const warrantyText = wDays > 0 ? `${wDays} Days Warranty` : "No Warranty";
    const balNum = Number(ticket.balanceAmount || 0);
    const estNum = Number(ticket.estimatedCost || 0);
    const isSettled = estNum > 0 && balNum <= 0;
    const paymentLine = isSettled
      ? "💰 Payment: PAID IN FULL ✓ (No balance to pay)"
      : `💰 Balance to Pay: ₹${ticket.balanceAmount}`;

    if (resolvedType === "pickup") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Great news! Your ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) has been repaired and is READY FOR PICKUP at Famous Mobiles.\n\n` +
        `${paymentLine}\n` +
        `🛡️ Warranty: ${warrantyText} (from collection date)\n` +
        `📍 Shop: Opp Friends Colony Bus Stop, Manikonda, Hyderabad\n` +
        `📞 Call: ${SHOP.mobile}\n\n` +
        `Track details: ${trackUrl}\n\n` +
        `Please collect your device during shop hours. Thank you!`;
    } else if (resolvedType === "estimate") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `We have inspected your ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) at Famous Mobiles.\n\n` +
        `📋 Issue: ${ticket.problemDescription || "Device inspection"}\n` +
        `💰 Estimated Repair Cost: ₹${ticket.estimatedCost}\n` +
        `💵 Advance Paid: ₹${ticket.advancePaid}\n` +
        `⏳ Balance on Delivery: ₹${ticket.balanceAmount}\n` +
        `🛡️ Warranty Offered: ${warrantyText}\n\n` +
        `Track details: ${trackUrl}\n\n` +
        `Please reply to this message to APPROVE the repair so our technician can begin. Thank you!`;
    } else if (ticket.status === "RETURNED_UNREPAIRED") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Your device ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) has been returned unrepaired at Famous Mobiles.\n\n` +
        `🔖 Status: Returned Unrepaired\n` +
        `💰 Repair Cost: ₹0 (Any advance paid has been refunded)\n` +
        `📍 Shop: Opp Friends Colony Bus Stop, Manikonda, Hyderabad\n` +
        `📞 Call: ${SHOP.mobile}\n\n` +
        `Track details: ${trackUrl}\n\n` +
        `Thank you for visiting Famous Mobiles!`;
    } else {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Here is an update on your repair from Famous Mobiles:\n\n` +
        `📱 Device: ${ticket.brand} ${ticket.model}\n` +
        `🔖 Ticket: ${ticket.trackingNumber}\n` +
        `⚡ Status: ${formatStatus(ticket.status)}\n` +
        (estNum === 0
          ? "💰 Estimate: Pending Diagnosis\n"
          : isSettled
          ? `💰 Repair Cost: ₹${ticket.estimatedCost} (PAID IN FULL ✓)\n`
          : `💰 Est. Cost: ₹${ticket.estimatedCost} (Balance: ₹${ticket.balanceAmount})\n`) +
        `🛡️ Warranty: ${warrantyText}\n\n` +
        `Track your repair status live here:\n${trackUrl}\n\n` +
        `Thank you!`;
    }

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (authLoading || loading) return <PageLoading label="Loading ticket..." />;
  if (loadError || !ticket) {
    return (
      <StaffLayout userName={user?.fullName} role={user?.role}>
        <Alert variant="error">{loadError || "Ticket not found"}</Alert>
      </StaffLayout>
    );
  }

  const selectableStatuses = REPAIR_STATUSES.filter((s) => s !== ticket.status);
  const canUpdateStatus = ticket.status !== "DELIVERED" && ticket.status !== "RETURNED_UNREPAIRED" && selectableStatuses.length > 0;
  const overdue = isOverdue(ticket.estimatedDeliveryDate, ticket.status);

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="mx-auto max-w-3xl space-y-5 animate-fade-in pb-36 md:pb-8">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl gradient-hero p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Repair Job</p>
              <h1 className="text-2xl font-bold">{ticket.brand} {ticket.model}</h1>
              <p className="mt-1 font-mono text-sm opacity-90">{ticket.trackingNumber}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className="bg-white/20 text-white border-0 text-sm">{formatStatus(ticket.status)}</Badge>
              {getWarrantyStatus(ticket).status !== "NONE" && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {getWarrantyStatus(ticket).label}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <span className="flex items-center gap-2"><User className="h-4 w-4 opacity-70" />{ticket.customer.fullName}</span>
            <a href={`tel:${ticket.customer.mobile}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4 opacity-70" />{formatCustomerMobiles(ticket.customer)}</a>
            <span className="flex items-center gap-2"><Wrench className="h-4 w-4 opacity-70" />{ticket.assignedTechnicianName ?? "Unassigned"}</span>
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 opacity-70" />EDD: {formatDate(ticket.estimatedDeliveryDate)}</span>
          </div>
          {overdue && <p className="mt-3 rounded-lg bg-red-500/30 px-3 py-1.5 text-xs font-bold">⚠ Overdue repair</p>}
          <div className="mt-4 rounded-xl bg-white/15 p-3 backdrop-blur-sm">
            <StatusProgress status={ticket.status} compact />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm flex items-center gap-1.5"
              onClick={() => openWhatsApp("auto")}
            >
              <MessageCircle className="h-4 w-4" />
              {ticket.status === "READY_FOR_PICKUP"
                ? "WhatsApp: Ready for Pickup 🚀"
                : ticket.status === "WAITING_FOR_APPROVAL"
                ? "WhatsApp: Request Approval 💬"
                : ticket.status === "RETURNED_UNREPAIRED"
                ? "WhatsApp: Return Notice 📦"
                : "WhatsApp Update"}
            </Button>
            <Button size="sm" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={downloadReceipt}><Download className="h-4 w-4" /> PDF</Button>
            <Button size="sm" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={printReceipt}><Printer className="h-4 w-4" /> Print</Button>
          </div>
        </div>

        {/* Cost summary */}
        <div ref={estimateSectionRef} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Repair Cost & Balance</h3>
            {canUpdateStatus && !editingEstimate && (
              <button
                type="button"
                onClick={() => {
                  setNewEstimateCost(ticket.estimatedCost && Number(ticket.estimatedCost) > 0 ? String(ticket.estimatedCost) : "");
                  setNewEstimateRemarks("");
                  setNewEstimateWarrantyDays(ticket.warrantyDays ?? 30);
                  setEditingEstimate(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Pencil className="h-3 w-3" />
                {Number(ticket.estimatedCost) === 0 ? "Add Estimate & Warranty +" : "Edit Estimate & Warranty"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Estimated Cost</p>
              {Number(ticket.estimatedCost) === 0 ? (
                <div className="mt-1">
                  <span className="inline-block rounded bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5">
                    Pending Diagnosis
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold text-slate-900">{formatCurrency(Number(ticket.estimatedCost))}</p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Advance Paid</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(Number(ticket.advancePaid))}</p>
            </div>
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">
                {Number(ticket.estimatedCost) > 0 && Number(ticket.balanceAmount) <= 0
                  ? "Payment Status"
                  : "Balance Due"}
              </p>
              {Number(ticket.estimatedCost) === 0 ? (
                <div className="mt-1">
                  <span className="inline-block rounded bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5">
                    To be quoted
                  </span>
                </div>
              ) : Number(ticket.balanceAmount) <= 0 ? (
                <div className="mt-1">
                  <span className="inline-block rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 border border-emerald-300">
                    Paid in Full ✓
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold text-slate-900">{formatCurrency(Number(ticket.balanceAmount))}</p>
              )}
            </div>
          </div>

          {editingEstimate && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  {Number(ticket.estimatedCost) === 0 ? "Add Initial Repair Estimate" : "Update Repair Estimate"}
                </p>
                <span className="text-xs text-slate-600 font-medium">
                  Advance Paid: {formatCurrency(Number(ticket.advancePaid))}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Estimated Cost (₹) *</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    placeholder="e.g. 1000"
                    value={newEstimateCost}
                    onChange={(e) => setNewEstimateCost(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Remarks / Reason (Optional)</label>
                  <Input
                    placeholder="e.g. Battery replaced + frame fix"
                    value={newEstimateRemarks}
                    onChange={(e) => setNewEstimateRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-blue-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    🛡️ Service Warranty Period
                  </label>
                  <span className="text-xs font-semibold text-emerald-700">
                    {newEstimateWarrantyDays > 0 ? `${newEstimateWarrantyDays} Days Selected` : "No Warranty"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WARRANTY_OPTIONS.map((w) => (
                    <button
                      key={w.days}
                      type="button"
                      onClick={() => setNewEstimateWarrantyDays(w.days)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        newEstimateWarrantyDays === w.days
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  {newEstimateWarrantyDays > 0
                    ? `Customer will receive ${newEstimateWarrantyDays} days warranty from delivery date (printed on receipt & tracking).`
                    : "Counter testing warranty only; no post-collection warranty coverage."}
                </p>
              </div>

              {newEstimateCost && !isNaN(Number(newEstimateCost)) && (
                <div className="flex items-center justify-between text-xs rounded-lg bg-white border border-blue-100 p-2 text-slate-700">
                  <span>
                    New Balance will be:{" "}
                    <strong className="text-blue-900 text-sm">
                      {formatCurrency(Math.max(0, Number(newEstimateCost) - Number(ticket.advancePaid)))}
                    </strong>
                  </span>
                  {Number(ticket.advancePaid) > Number(newEstimateCost) && (
                    <span className="text-red-700 font-semibold">
                      ❌ Cannot be less than advance ({formatCurrency(Number(ticket.advancePaid))})
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingEstimate(false)}
                  disabled={savingEstimate}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={saveEstimation}
                  disabled={
                    savingEstimate ||
                    !newEstimateCost ||
                    isNaN(Number(newEstimateCost)) ||
                    Number(newEstimateCost) < Number(ticket.advancePaid)
                  }
                >
                  {savingEstimate ? "Saving..." : "Save Estimate & Warranty"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!ticket.assignedTechnicianName && (
                <Button className="w-full" onClick={assignSelf}>I&apos;m repairing this device</Button>
              )}
              {user?.role === "ADMIN" && (
                <>
                  <select className={selectClassName} value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                    <option value="">Select technician...</option>
                    {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <Button className="w-full" onClick={assignTechnician} disabled={!assignId}>Assign</Button>
                </>
              )}
              {ticket.assignedTechnicianName && user?.role !== "ADMIN" && (
                <p className="text-sm text-slate-600">{ticket.assignedTechnicianName} is assigned.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {canUpdateStatus ? (
                <>
                  <select
                    className={selectClassName}
                    value={nextStatus}
                    onChange={(e) => {
                      setNextStatus(e.target.value as RepairStatus);
                      setPaymentWarning("");
                    }}
                  >
                    <option value="">Select next status...</option>
                    {selectableStatuses.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
                  </select>
                  <Textarea placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />

                  {/* Payment pending warning when DELIVERED is selected */}
                  {nextStatus === "DELIVERED" && Number(ticket.balanceAmount) > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-xs text-amber-900 flex items-center justify-between shadow-xs animate-fade-in">
                      <div className="space-y-0.5">
                        <span className="font-bold flex items-center gap-1 text-amber-950">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Payment Pending: {formatCurrency(Number(ticket.balanceAmount))}
                        </span>
                        <p className="text-amber-800">Clear remaining balance before device handover.</p>
                      </div>
                      {user?.role !== "TECHNICIAN" && (
                        <button
                          type="button"
                          onClick={() => scrollToPaymentSection(true)}
                          className="rounded bg-amber-200 hover:bg-amber-300 px-2.5 py-1 text-amber-950 font-bold transition-colors shrink-0 ml-2 shadow-xs cursor-pointer"
                        >
                          Record Payment ↓
                        </button>
                      )}
                    </div>
                  )}

                  {paymentWarning && (
                    <Alert variant="warning" className="border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-2 text-xs py-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-950">{paymentWarning}</p>
                        {user?.role !== "TECHNICIAN" && Number(ticket.balanceAmount) > 0 && (
                          <button
                            type="button"
                            onClick={() => scrollToPaymentSection(true)}
                            className="mt-1 font-bold underline hover:text-amber-950 cursor-pointer"
                          >
                            Jump to Record Payment section ↓
                          </button>
                        )}
                      </div>
                    </Alert>
                  )}

                  {paymentSuccessMsg && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2 text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">{paymentSuccessMsg}</span>
                    </div>
                  )}

                  {nextStatus === "READY_FOR_PICKUP" && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs flex items-center justify-between text-emerald-800">
                      <span>Ready for Pickup alert template ready</span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp("pickup")}
                        className="font-bold underline hover:text-emerald-950 flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" /> Preview WhatsApp
                      </button>
                    </div>
                  )}

                  {nextStatus === "WAITING_FOR_APPROVAL" && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2.5 text-xs text-amber-900 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Estimate Approval Required
                        </span>
                        <button
                          type="button"
                          onClick={() => openWhatsApp("estimate")}
                          className="font-bold underline hover:text-amber-950 flex items-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" /> Preview WhatsApp
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-amber-950 block">
                          {Number(ticket.estimatedCost) === 0
                            ? "Enter estimated cost to seek customer approval (₹) *"
                            : `Current Estimate: ${formatCurrency(Number(ticket.estimatedCost))}. Update quote if needed:`}
                        </label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="0"
                          placeholder={ticket.estimatedCost && Number(ticket.estimatedCost) > 0 ? String(ticket.estimatedCost) : "e.g. 2500"}
                          value={approvalEstimateCost}
                          onChange={(e) => setApprovalEstimateCost(e.target.value)}
                          className="bg-white border-amber-300"
                        />
                        {approvalEstimateCost && !isNaN(Number(approvalEstimateCost)) && (
                          <div className="text-[11px] space-y-0.5">
                            <p className="text-amber-800">
                              New balance will be: <strong>{formatCurrency(Math.max(0, Number(approvalEstimateCost) - Number(ticket.advancePaid)))}</strong>
                            </p>
                            {Number(approvalEstimateCost) < Number(ticket.advancePaid) && (
                              <p className="text-red-700 font-semibold">
                                ❌ Cannot be less than advance already paid ({formatCurrency(Number(ticket.advancePaid))})
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-amber-200">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-amber-950 text-xs block">
                            🛡️ Warranty Period to Offer Customer:
                          </label>
                          <span className="text-xs font-semibold text-amber-900">
                            {approvalWarrantyDays > 0 ? `${approvalWarrantyDays} Days` : "No Warranty"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {WARRANTY_OPTIONS.map((w) => (
                            <button
                              key={w.days}
                              type="button"
                              onClick={() => setApprovalWarrantyDays(w.days)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                approvalWarrantyDays === w.days
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                                  : "border-amber-300 bg-white text-slate-700 hover:border-emerald-400"
                              }`}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {nextStatus === "RETURNED_UNREPAIRED" && (
                    <div className="space-y-2 rounded-lg bg-slate-50 border border-slate-300 p-3 text-xs text-slate-800 animate-fade-in">
                      <label className="font-semibold text-slate-900 block">Reason for returning unrepaired:</label>
                      <select
                        className={selectClassName}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      >
                        <option value="Customer changed mind / Cancelled">Customer changed mind / Cancelled</option>
                        <option value="Device unrepairable (Motherboard / CPU / corrosion)">Device unrepairable (Motherboard / CPU / corrosion)</option>
                        <option value="Customer rejected revised estimate">Customer rejected revised estimate</option>
                        <option value="Spare parts unavailable">Spare parts unavailable</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="rounded bg-amber-50 border border-amber-200 p-2 text-amber-900 space-y-0.5">
                        <p className="font-semibold text-amber-950">⚠️ Cost & Advance Settlement:</p>
                        <p className="text-amber-800">
                          Total repair cost will be set to ₹0.
                          {Number(ticket.advancePaid) > 0 ? (
                            <strong className="text-amber-950"> Advance of {formatCurrency(Number(ticket.advancePaid))} will be marked as refunded to customer.</strong>
                          ) : (
                            " No advance was collected."
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={updateStatus}
                    disabled={
                      !nextStatus ||
                      (nextStatus === "WAITING_FOR_APPROVAL" &&
                        Boolean(approvalEstimateCost) &&
                        Number(approvalEstimateCost) < Number(ticket.advancePaid))
                    }
                  >
                    Update Status
                  </Button>

                  {justUpdatedStatus === "READY_FOR_PICKUP" && (
                    <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2.5 text-xs flex items-center justify-between text-emerald-900 animate-fade-in">
                      <span>Status updated!</span>
                      <button
                        type="button"
                        onClick={() => { openWhatsApp("pickup"); setJustUpdatedStatus(""); }}
                        className="font-bold bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Send Pickup WhatsApp
                      </button>
                    </div>
                  )}

                  {justUpdatedStatus === "WAITING_FOR_APPROVAL" && (
                    <div className="rounded-lg bg-amber-100 border border-amber-300 p-2.5 text-xs flex items-center justify-between text-amber-900 animate-fade-in">
                      <span>Status updated!</span>
                      <button
                        type="button"
                        onClick={() => { openWhatsApp("estimate"); setJustUpdatedStatus(""); }}
                        className="font-bold bg-amber-600 text-white px-2.5 py-1 rounded hover:bg-amber-700 flex items-center gap-1 shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Send Estimate to Customer
                      </button>
                    </div>
                  )}

                  {justUpdatedStatus === "RETURNED_UNREPAIRED" && (
                    <div className="rounded-lg bg-slate-100 border border-slate-300 p-2.5 text-xs flex items-center justify-between text-slate-900 animate-fade-in">
                      <span>Device marked as Returned Unrepaired. Cost set to ₹0.</span>
                      <button
                        type="button"
                        onClick={() => { openWhatsApp("auto"); setJustUpdatedStatus(""); }}
                        className="font-bold bg-slate-700 text-white px-2.5 py-1 rounded hover:bg-slate-800 flex items-center gap-1 shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Send Return Notice
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">This repair is complete.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Device info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Device Details</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-slate-500">IMEI:</span> {ticket.imei || "—"}</p>
            <p><span className="text-slate-500">Color:</span> {ticket.color || "—"}</p>
            <p className="sm:col-span-2"><span className="text-slate-500">Problem:</span> {ticket.problemDescription || "—"}</p>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Repair Timeline</CardTitle></CardHeader>
          <CardContent><ActivityTimeline entries={timeline} /></CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Add Note</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Write a note..." value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
            <Button onClick={addNote}>Add</Button>
          </CardContent>
        </Card>

        {user?.role !== "TECHNICIAN" && (
          <div ref={paymentSectionRef} id="record-payment-section" className="scroll-mt-6">
            <Card
              className={cn(
                "transition-all duration-300",
                highlightPayment && "ring-4 ring-amber-400 border-amber-500 shadow-xl bg-amber-50/20"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Record Payment</CardTitle>
                {Number(ticket.balanceAmount) > 0 ? (
                  <Badge variant="warning" className="border border-amber-400 bg-amber-50 text-amber-900 font-semibold text-xs">
                    Pending Balance: {formatCurrency(Number(ticket.balanceAmount))}
                  </Badge>
                ) : (
                  <Badge variant="success" className="border border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold text-xs">
                    Paid in Full ✓
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {highlightPayment && (
                  <div className="rounded-lg bg-amber-100 border border-amber-300 p-2.5 text-xs text-amber-950 font-medium flex items-center justify-between animate-pulse">
                    <span>👉 Complete pending payment of {formatCurrency(Number(ticket.balanceAmount))} below:</span>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Number(ticket.balanceAmount)))}
                      className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                    >
                      Fill ₹{ticket.balanceAmount}
                    </button>
                  </div>
                )}

                {paymentSuccessMsg && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      {paymentSuccessMsg}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-600 text-emerald-800 hover:bg-emerald-100 font-semibold cursor-pointer"
                        onClick={() => openWhatsApp("general")}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Send WhatsApp Update
                      </Button>
                      {Number(ticket.balanceAmount) <= 0 && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                          onClick={() => {
                            setNextStatus("DELIVERED");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Mark as Delivered ↑
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Input
                    ref={payAmountInputRef}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Amount"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-32"
                  />
                  <select className={selectClassName} value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                  <Button
                    onClick={recordPayment}
                    disabled={
                      !payAmount ||
                      Number(payAmount) <= 0 ||
                      Number(payAmount) > Number(ticket.balanceAmount)
                    }
                  >
                    Record Payment
                  </Button>
                  {Number(ticket.balanceAmount) > 0 && Number(payAmount) !== Number(ticket.balanceAmount) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                      onClick={() => setPayAmount(String(Number(ticket.balanceAmount)))}
                    >
                      Full Balance ({formatCurrency(Number(ticket.balanceAmount))})
                    </Button>
                  )}
                </div>
                {Number(payAmount) > Number(ticket.balanceAmount) && (
                  <p className="text-xs text-red-600 font-medium">
                    ❌ Payment amount cannot exceed remaining balance of {formatCurrency(Number(ticket.balanceAmount))}
                  </p>
                )}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Recorded Transactions ({payments.length})
                    </p>
                    {ticket && Number(ticket.advancePaid) > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Total Collected: {formatCurrency(Number(ticket.advancePaid))}
                      </span>
                    )}
                  </div>

                  {payments.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center text-xs text-slate-500">
                      {Number(ticket.advancePaid) > 0 ? (
                        <p>
                          Advance payment of <strong className="text-slate-800">{formatCurrency(Number(ticket.advancePaid))}</strong> was recorded for this ticket.
                        </p>
                      ) : (
                        <p>No payments recorded yet for this repair.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {formatCurrency(Number(p.amount))}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                {p.paymentMode}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 flex items-center gap-1.5">
                              <span className="text-slate-400">👤</span>
                              <span>
                                Recorded by <strong className="text-slate-800 font-semibold">{p.recordedByName || "Staff"}</strong>
                              </span>
                              {p.notes && (
                                <span className="text-slate-500 italic">· &quot;{p.notes}&quot;</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-700">
                              {formatDateTime(p.createdAt)}
                            </p>
                            <span className="text-[10px] text-emerald-600 font-medium">
                              Verified Receipt ✓
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mobile Bench Sticky Action Dock (Option A) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-3 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md shadow-[0_-8px_25px_rgb(0,0,0,0.1)] md:hidden">
          {/* Row 1: Instant 1-Tap Status Advancement Stepper */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 kanban-scroll">
            {!ticket.assignedTechnicianName && (
              <button
                type="button"
                onClick={assignSelf}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
              >
                <User className="h-3.5 w-3.5" />
                Claim Job (Assign to Me)
              </button>
            )}

            {ticket.status === "DEVICE_RECEIVED" && (
              <>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("REPAIR_IN_PROGRESS")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Start Repair (In Progress)
                </button>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("WAITING_FOR_APPROVAL")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 active:scale-95 touch-target"
                >
                  Need Approval
                </button>
              </>
            )}

            {ticket.status === "REPAIR_IN_PROGRESS" && (
              <>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("READY_FOR_PICKUP")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready for Pickup
                </button>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("WAITING_FOR_PARTS")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800 active:scale-95 touch-target"
                >
                  Wait for Parts
                </button>
              </>
            )}

            {(ticket.status === "WAITING_FOR_APPROVAL" || ticket.status === "WAITING_FOR_PARTS") && (
              <>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("REPAIR_IN_PROGRESS")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Resume Repair
                </button>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("READY_FOR_PICKUP")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
                >
                  Mark Ready
                </button>
              </>
            )}

            {ticket.status === "READY_FOR_PICKUP" && (
              <>
                {Number(ticket.balanceAmount) > 0 ? (
                  <button
                    type="button"
                    onClick={() => scrollToPaymentSection(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
                  >
                    💵 Collect Balance ({formatCurrency(Number(ticket.balanceAmount))})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => quickUpdateStatus("DELIVERED")}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 touch-target"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hand Over & Deliver
                  </button>
                )}
              </>
            )}

            {ticket.status === "DELIVERED" && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Delivered & Settled ✓
              </span>
            )}
          </div>

          {/* Row 2: Secondary Quick-Touch Bench Actions */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => openWhatsApp("auto")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 touch-target"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
            <a
              href={`tel:${ticket.customer.mobile}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-2 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 touch-target"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setNewEstimateCost(ticket.estimatedCost && Number(ticket.estimatedCost) > 0 ? String(ticket.estimatedCost) : "");
                setNewEstimateRemarks("");
                setNewEstimateWarrantyDays(ticket.warrantyDays ?? 30);
                setEditingEstimate(true);
                setTimeout(() => {
                  estimateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 120);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 active:scale-95 touch-target"
            >
              <Pencil className="h-4 w-4" />
              <span>Quote</span>
            </button>
            {Number(ticket.balanceAmount) > 0 && (
              <button
                type="button"
                onClick={() => scrollToPaymentSection(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-2 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 active:scale-95 touch-target"
              >
                <span>Pay ₹</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
