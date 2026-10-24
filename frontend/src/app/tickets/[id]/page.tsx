"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Calendar, CheckCircle2, Download, MessageCircle, Phone, Printer, User, Wrench } from "lucide-react";
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
import { formatCurrency, formatDate, formatStatus, formatCustomerMobiles, cn } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
import { SHOP } from "@/lib/shop";
import { Alert } from "@/components/ui/alert";
import { PageLoading } from "@/components/ui/skeleton";

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

  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const payAmountInputRef = useRef<HTMLInputElement>(null);

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

  const updateStatus = async () => {
    if (!nextStatus) return;
    const targetStatus = nextStatus;
    const balance = Number(ticket?.balanceAmount ?? 0);

    // Guard: delivered status requires full payment
    if (targetStatus === "DELIVERED" && balance > 0) {
      if (user?.role === "TECHNICIAN") {
        setPaymentWarning(
          `Payment is pending (${formatCurrency(balance)}). Technicians cannot collect payments. Please have front-desk staff or admin record the balance first.`
        );
      } else {
        setPaymentWarning(
          `Payment is pending! ${formatCurrency(balance)} balance remains. Please record the payment before marking this ticket as Delivered.`
        );
        scrollToPaymentSection(true);
      }
      return;
    }

    setPaymentWarning("");
    try {
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
    try {
      const blob = await api<Blob>(`/tickets/${id}/receipt/pdf`);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${ticket?.trackingNumber}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download receipt");
    }
  };

  const printReceipt = async () => {
    try {
      const blob = await api<Blob>(`/tickets/${id}/receipt/pdf`);
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        }, 300);
      };
    } catch {
      try {
        const blob = await api<Blob>(`/tickets/${id}/receipt/pdf`);
        const w = window.open(URL.createObjectURL(blob));
        w?.print();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to load receipt PDF");
      }
    }
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
    if (resolvedType === "pickup") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Great news! Your ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) has been repaired and is READY FOR PICKUP at Famous Mobiles.\n\n` +
        `💰 Balance to Pay: ₹${ticket.balanceAmount}\n` +
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
        `⏳ Balance on Delivery: ₹${ticket.balanceAmount}\n\n` +
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
        `💰 Est. Cost: ₹${ticket.estimatedCost} (Balance: ₹${ticket.balanceAmount})\n\n` +
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
      <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl gradient-hero p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Repair Job</p>
              <h1 className="text-2xl font-bold">{ticket.brand} {ticket.model}</h1>
              <p className="mt-1 font-mono text-sm opacity-90">{ticket.trackingNumber}</p>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-sm">{formatStatus(ticket.status)}</Badge>
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
              variant="outline"
              className="border-emerald-400/50 bg-emerald-600/30 text-white hover:bg-emerald-600/50 font-medium"
              onClick={() => openWhatsApp("auto")}
            >
              <MessageCircle className="h-4 w-4 text-emerald-300" />
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Estimated", value: formatCurrency(Number(ticket.estimatedCost)) },
            { label: "Advance", value: formatCurrency(Number(ticket.advancePaid)) },
            { label: "Balance", value: formatCurrency(Number(ticket.balanceAmount)) },
          ].map((item) => (
            <div key={item.label} className="premium-card p-3 text-center">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {user?.role === "TECHNICIAN" && !ticket.assignedTechnicianName && (
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
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs flex items-center justify-between text-amber-800">
                      <span>Estimate approval request template ready</span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp("estimate")}
                        className="font-bold underline hover:text-amber-950 flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" /> Preview WhatsApp
                      </button>
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

                  <Button className="w-full" onClick={updateStatus} disabled={!nextStatus}>Update Status</Button>

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
                  <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2.5 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      {paymentSuccessMsg}
                    </span>
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
                )}

                <div className="flex flex-wrap gap-2">
                  <Input
                    ref={payAmountInputRef}
                    type="number"
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
                  <Button onClick={recordPayment} disabled={!payAmount || Number(payAmount) <= 0}>
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
                {payments.map((p) => (
                  <p key={p.id} className="text-sm text-slate-600">
                    {formatCurrency(Number(p.amount))} via {p.paymentMode} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
