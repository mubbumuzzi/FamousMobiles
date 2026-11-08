"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertTriangle, Calendar, Camera, CheckCircle2, Download, MessageCircle, Pencil, Phone, Printer, RotateCcw, User, Wrench } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { StatusProgress } from "@/components/tracking/StatusProgress";
import { ActivityTimeline } from "@/components/tracking/ActivityTimeline";
import { DevicePhotoGallery } from "@/components/tickets/DevicePhotoGallery";
import { DeliveryVerificationModal } from "@/components/tickets/DeliveryVerificationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, selectClassName } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { api, getCachedApi } from "@/lib/api";
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

function statusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP") return "warning";
  if (status.includes("WAITING")) return "warning";
  if (status === "RETURNED_UNREPAIRED") return "destructive";
  return "default";
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = params?.id || searchParams.get("id");
  const id = rawId && rawId !== "view" ? rawId : searchParams.get("id") || "";
  const { user, loading: authLoading } = useAuthGuard();
  const [ticket, setTicket] = useState<Ticket | null>(
    () => (id ? getCachedApi<Ticket>(`/tickets/${id}`) ?? null : null)
  );
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState<boolean>(
    () => (id ? !getCachedApi<Ticket>(`/tickets/${id}`) : true)
  );
  const [timeline, setTimeline] = useState<TimelineEntry[]>(
    () => (id ? getCachedApi<TimelineEntry[]>(`/tickets/${id}/timeline`) ?? [] : [])
  );
  const [payments, setPayments] = useState<Payment[]>(
    () => (id ? getCachedApi<Payment[]>(`/tickets/${id}/payments`) ?? [] : [])
  );
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<RepairStatus | "">("");
  const [justUpdatedStatus, setJustUpdatedStatus] = useState<RepairStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [paymentWarning, setPaymentWarning] = useState("");
  const [highlightPayment, setHighlightPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");
  const [cancelReason, setCancelReason] = useState("Customer changed mind / Cancelled");
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [newEstimateCost, setNewEstimateCost] = useState("");
  const [newEstimateRemarks, setNewEstimateRemarks] = useState("");
  const [newEstimateWarrantyDays, setNewEstimateWarrantyDays] = useState<number>(0);
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [approvalEstimateCost, setApprovalEstimateCost] = useState("");
  const [approvalWarrantyDays, setApprovalWarrantyDays] = useState<number>(0);

  // 7-Day Re-Check & Warranty Reopen state
  const [recheckModalOpen, setRecheckModalOpen] = useState(false);
  const [recheckReasonType, setRecheckReasonType] = useState<"SAME_ISSUE" | "NEW_ISSUE">("SAME_ISSUE");
  const [recheckReason, setRecheckReason] = useState("");
  const [recheckRemarks, setRecheckRemarks] = useState("");
  const [recheckCost, setRecheckCost] = useState("0");
  const [recheckTechId, setRecheckTechId] = useState("");
  const [submittingRecheck, setSubmittingRecheck] = useState(false);
  const [recheckError, setRecheckError] = useState("");

  // Delivery Photo Verification modal state
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const payAmountInputRef = useRef<HTMLInputElement>(null);
  const estimateSectionRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!id || !getCachedApi(`/tickets/${id}`)) {
      setLoading(true);
    }
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
    const handleFmRefresh = () => {
      load();
    };
    window.addEventListener("fm:refresh", handleFmRefresh);
    return () => window.removeEventListener("fm:refresh", handleFmRefresh);
  }, [id]);

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

  const handleConfirmDeliveryFromModal = async () => {
    try {
      await api(`/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "DELIVERED",
          remarks: "Handed over to customer with visual photo & specification verification",
          technicianNotes: "Handed over to customer with visual photo & specification verification",
        }),
      });
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(30); } catch (_) {}
      }
      setJustUpdatedStatus("DELIVERED");
      setNextStatus("");
      load();
    } catch (err: any) {
      alert(err?.message || "Failed to mark as delivered");
    }
  };

  const handleQuickUploadPhoto = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("photoType", "DEVICE");
    await api(`/tickets/${id}/photos?photoType=DEVICE`, {
      method: "POST",
      body: formData,
    });
    load();
  };

  const quickUpdateStatus = async (targetStatus: RepairStatus) => {
    const balance = Number(ticket?.balanceAmount ?? 0);
    if (targetStatus === "DELIVERED") {
      if (balance > 0) {
        setPaymentWarning(
          `Payment is pending! ${formatCurrency(balance)} balance remains. Please record the payment before marking as Delivered.`
        );
        scrollToPaymentSection(true);
        return;
      }
      setIsDeliveryModalOpen(true);
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
    if (targetStatus === "DELIVERED") {
      if (balance > 0) {
        setPaymentWarning(
          `Payment is pending! ${formatCurrency(balance)} balance remains. Please record the payment before marking this ticket as Delivered.`
        );
        scrollToPaymentSection(true);
        return;
      }
      setIsDeliveryModalOpen(true);
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

    const shopName = ticket.store?.name || "Famous Mobiles";
    const shopAddress = ticket.store
      ? [ticket.store.addressLine1, ticket.store.addressLine2, ticket.store.city].filter(Boolean).join(", ")
      : "Opp Friends Colony Bus Stop, Manikonda, Hyderabad";
    const shopMobile = ticket.store?.mobile || SHOP.mobile;

    if (resolvedType === "pickup") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Great news! Your ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) has been repaired and is READY FOR PICKUP at ${shopName}.\n\n` +
        `${paymentLine}\n` +
        `🛡️ Warranty: ${warrantyText} (from collection date)\n` +
        `📍 Shop: ${shopAddress}\n` +
        `📞 Call: ${shopMobile}\n\n` +
        `Please collect your device during shop hours. Thank you!`;
    } else if (resolvedType === "estimate") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `We have inspected your ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) at ${shopName}.\n\n` +
        `📋 Issue: ${ticket.problemDescription || "Device inspection"}\n` +
        `💰 Estimated Repair Cost: ₹${ticket.estimatedCost}\n` +
        `💵 Advance Paid: ₹${ticket.advancePaid}\n` +
        `⏳ Balance on Delivery: ₹${ticket.balanceAmount}\n` +
        `🛡️ Warranty Offered: ${warrantyText}\n` +
        `📞 Call: ${shopMobile}\n\n` +
        `Please reply to this message to APPROVE the repair so our technician can begin. Thank you!`;
    } else if (ticket.status === "RETURNED_UNREPAIRED") {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Your device ${ticket.brand} ${ticket.model} (Ticket: ${ticket.trackingNumber}) has been returned unrepaired at ${shopName}.\n\n` +
        `🔖 Status: Returned Unrepaired\n` +
        `💰 Repair Cost: ₹0 (Any advance paid has been refunded)\n` +
        `📍 Shop: ${shopAddress}\n` +
        `📞 Call: ${shopMobile}\n\n` +
        `Thank you for visiting ${shopName}!`;
    } else {
      text =
        `Hello ${ticket.customer.fullName},\n\n` +
        `Here is an update on your repair from ${shopName}:\n\n` +
        `📱 Device: ${ticket.brand} ${ticket.model}\n` +
        `🔖 Ticket: ${ticket.trackingNumber}\n` +
        `⚡ Status: ${formatStatus(ticket.status)}\n` +
        (estNum === 0
          ? "💰 Estimate: Pending Diagnosis\n"
          : isSettled
          ? `💰 Repair Cost: ₹${ticket.estimatedCost} (PAID IN FULL ✓)\n`
          : `💰 Est. Cost: ₹${ticket.estimatedCost} (Balance: ₹${ticket.balanceAmount})\n`) +
        `🛡️ Warranty: ${warrantyText}\n` +
        `📞 Call shop: ${shopMobile}\n\n` +
        `Thank you!`;
    }

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, "_blank");
  };

  useEffect(() => {
    if (ticket && ticket.status === "DELIVERED") {
      if (searchParams.get("recheck") === "true" || searchParams.get("openRecheck") === "true") {
        setRecheckModalOpen(true);
      }
    }
  }, [ticket, searchParams]);

  const daysSinceDelivery = ticket?.daysSinceDelivery ?? (ticket?.deliveredAt
    ? Math.floor((Date.now() - new Date(ticket.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
    : null);
  const isEligibleForFree = ticket?.eligibleForFreeRecheck ?? (
    daysSinceDelivery !== null && daysSinceDelivery <= Math.max(7, ticket?.warrantyDays ?? 0)
  );

  const handleReopenTicket = async () => {
    if (!recheckRemarks.trim()) {
      setRecheckError("Please enter customer complaint notes.");
      return;
    }
    setSubmittingRecheck(true);
    setRecheckError("");
    try {
      const extraCost = recheckReasonType === "NEW_ISSUE" && Number(recheckCost) > 0 ? Number(recheckCost) : 0;
      const defaultReason = isEligibleForFree ? "7-Day Free Re-Check" : "Post-Delivery Rework";
      const body = {
        reason: recheckReason.trim() || defaultReason,
        remarks: recheckRemarks.trim(),
        additionalCost: extraCost,
        technicianId: recheckTechId || undefined,
      };
      const updated = await api<Ticket>(`/tickets/${ticket!.id}/reopen`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setTicket(updated);
      setRecheckModalOpen(false);
      setPaymentSuccessMsg("Ticket reopened for quality re-check! Status set to Under Diagnosis.");
      load();
    } catch (err: unknown) {
      setRecheckError(err instanceof Error ? err.message : "Failed to reopen ticket");
    } finally {
      setSubmittingRecheck(false);
    }
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
      <div className="mx-auto max-w-3xl space-y-5 animate-fade-in pb-36 md:pb-8 text-[#121212]">
        {/* Hero */}
        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-5 text-[#121212] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#767676]">Repair Job</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <h1 className="text-[22px] leading-[26px] font-bold text-[#121212] tracking-tight">{ticket.brand} {ticket.model}</h1>
                {ticket.photos && ticket.photos.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-semibold text-[#121212]">
                    <Camera className="h-3 w-3 text-[#767676]" />
                    {ticket.photos.length} Photo{ticket.photos.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="font-mono text-[13px] text-[#767676]">{ticket.trackingNumber}</p>
                {ticket.store && (
                  <span className="rounded-[4px] bg-[#F0F0F2] px-2 py-0.5 text-[11px] font-semibold text-[#121212]">
                    {ticket.store.displayName || ticket.store.name} ({ticket.store.code})
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant={statusVariant(ticket.status)}>{formatStatus(ticket.status)}</Badge>
              {ticket.reopenCount && ticket.reopenCount > 0 ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#FFF4EB] text-[#B35300] border border-[#B35300]/20 flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Re-Check ({ticket.reopenCount}x)
                </span>
              ) : null}
              {getWarrantyStatus(ticket).status !== "NONE" && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[#F0F0F2] text-[#121212] border border-[#EBEBEB]">
                  {getWarrantyStatus(ticket).label}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 text-[13px] sm:grid-cols-2 pt-3 border-t border-[#EBEBEB]">
            <span className="flex items-center gap-2 text-[#121212]"><User className="h-4 w-4 text-[#767676]" />{ticket.customer.fullName}</span>
            <a href={`tel:${ticket.customer.mobile}`} className="flex items-center gap-2 text-[#121212] hover:underline"><Phone className="h-4 w-4 text-[#767676]" />{formatCustomerMobiles(ticket.customer)}</a>
            <span className="flex items-center gap-2 text-[#121212]"><Wrench className="h-4 w-4 text-[#767676]" />{ticket.assignedTechnicianName ?? "Unassigned"}</span>
            <span className="flex items-center gap-2 text-[#121212]"><Calendar className="h-4 w-4 text-[#767676]" />EDD: {formatDate(ticket.estimatedDeliveryDate)}</span>
          </div>
          {overdue && <p className="mt-3 rounded-[8px] bg-[#FDE8E8] border border-[#FDE8E8] px-3 py-1.5 text-xs font-semibold text-[#C5221F]">Overdue repair</p>}
          <div className="mt-4 rounded-[10px] bg-[#F7F7F8] p-3 border border-[#EBEBEB]">
            <StatusProgress status={ticket.status} compact />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              className="h-9 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              onClick={() => openWhatsApp("auto")}
            >
              <MessageCircle className="h-4 w-4" />
              {ticket.status === "READY_FOR_PICKUP"
                ? "WhatsApp: Ready for Pickup"
                : ticket.status === "WAITING_FOR_APPROVAL"
                ? "WhatsApp: Request Approval"
                : ticket.status === "RETURNED_UNREPAIRED"
                ? "WhatsApp: Return Notice"
                : "WhatsApp Update"}
            </Button>
            <Button size="sm" variant="secondary" className="h-9 text-xs border border-[#EBEBEB] cursor-pointer" onClick={downloadReceipt}><Download className="h-4 w-4" /> PDF</Button>
            <Button size="sm" variant="secondary" className="h-9 text-xs border border-[#EBEBEB] cursor-pointer" onClick={printReceipt}><Printer className="h-4 w-4" /> Print</Button>
          </div>
        </div>

        {/* Cost summary */}
        <div ref={estimateSectionRef} className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#767676]">Repair Cost & Balance</h3>
            {canUpdateStatus && !editingEstimate && (
              <button
                type="button"
                onClick={() => {
                  setNewEstimateCost(ticket.estimatedCost && Number(ticket.estimatedCost) > 0 ? String(ticket.estimatedCost) : "");
                  setNewEstimateRemarks("");
                  setNewEstimateWarrantyDays(ticket.warrantyDays ?? 0);
                  setEditingEstimate(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#121212] bg-[#F0F0F2] hover:bg-[#EBEBEB] border border-[#EBEBEB] px-2.5 py-1 rounded-[8px] transition-colors cursor-pointer"
              >
                <Pencil className="h-3 w-3" />
                {Number(ticket.estimatedCost) === 0 ? "Add Estimate & Warranty +" : "Edit Estimate & Warranty"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[10px] bg-[#F7F7F8] border border-[#EBEBEB] p-3 text-center">
              <p className="text-[12px] text-[#767676]">Estimated Cost</p>
              {Number(ticket.estimatedCost) === 0 ? (
                <div className="mt-1">
                  <span className="inline-block rounded-[4px] bg-[#FFF4EB] text-[#B35300] text-xs font-semibold px-2 py-0.5">
                    Pending Diagnosis
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold text-[#121212]">{formatCurrency(Number(ticket.estimatedCost))}</p>
              )}
            </div>
            <div className="rounded-[10px] bg-[#F7F7F8] border border-[#EBEBEB] p-3 text-center">
              <p className="text-[12px] text-[#767676]">Advance Paid</p>
              <p className="text-lg font-bold text-[#0E8345]">{formatCurrency(Number(ticket.advancePaid))}</p>
            </div>
            <div className="rounded-[10px] bg-[#F7F7F8] border border-[#EBEBEB] p-3 text-center">
              <p className="text-[12px] text-[#767676]">
                {Number(ticket.estimatedCost) > 0 && Number(ticket.balanceAmount) <= 0
                  ? "Payment Status"
                  : "Balance Due"}
              </p>
              {Number(ticket.estimatedCost) === 0 ? (
                <div className="mt-1">
                  <span className="inline-block rounded-[4px] bg-[#F0F0F2] text-[#767676] text-xs font-medium px-2 py-0.5">
                    To be quoted
                  </span>
                </div>
              ) : Number(ticket.balanceAmount) <= 0 ? (
                <div className="mt-1">
                  <span className="inline-block rounded-[6px] bg-[#EAF6EE] text-[#0E8345] text-xs font-bold px-2.5 py-1">
                    Paid in Full ✓
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold text-[#B35300]">{formatCurrency(Number(ticket.balanceAmount))}</p>
              )}
            </div>
          </div>

          {editingEstimate && (
            <div className="rounded-[10px] border border-[#EBEBEB] bg-[#F7F7F8] p-3.5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#121212] uppercase tracking-wider">
                  {Number(ticket.estimatedCost) === 0 ? "Add Initial Repair Estimate" : "Update Repair Estimate"}
                </p>
                <span className="text-xs text-[#767676] font-medium">
                  Advance Paid: {formatCurrency(Number(ticket.advancePaid))}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#121212] block">Estimated Cost (₹) *</label>
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
                  <label className="text-xs font-semibold text-[#121212] block">Remarks / Reason (Optional)</label>
                  <Input
                    placeholder="e.g. Battery replaced + frame fix"
                    value={newEstimateRemarks}
                    onChange={(e) => setNewEstimateRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#EBEBEB]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#121212] flex items-center gap-1.5">
                    Service Warranty Period
                  </label>
                  <span className="text-xs font-semibold text-[#0E8345]">
                    {newEstimateWarrantyDays > 0 ? `${newEstimateWarrantyDays} Days Selected` : "No Warranty"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WARRANTY_OPTIONS.map((w) => (
                    <button
                      key={w.days}
                      type="button"
                      onClick={() => setNewEstimateWarrantyDays(w.days)}
                      className={`rounded-[8px] border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        newEstimateWarrantyDays === w.days
                          ? "border-[#121212] bg-[#121212] text-white shadow-2xs"
                          : "border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F7F7F8]"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#767676]">
                  {newEstimateWarrantyDays > 0
                    ? `Customer will receive ${newEstimateWarrantyDays} days warranty from delivery date (printed on receipt & tracking).`
                    : "Counter testing warranty only; no post-collection warranty coverage."}
                </p>
              </div>

              {newEstimateCost && !isNaN(Number(newEstimateCost)) && (
                <div className="flex items-center justify-between text-xs rounded-[8px] bg-white border border-[#EBEBEB] p-2 text-[#121212]">
                  <span>
                    New Balance will be:{" "}
                    <strong className="text-[#121212] text-sm">
                      {formatCurrency(Math.max(0, Number(newEstimateCost) - Number(ticket.advancePaid)))}
                    </strong>
                  </span>
                  {Number(ticket.advancePaid) > Number(newEstimateCost) && (
                    <span className="text-[#C5221F] font-semibold">
                      Cannot be less than advance ({formatCurrency(Number(ticket.advancePaid))})
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingEstimate(false)}
                  disabled={savingEstimate}
                  className="h-8 text-xs border border-[#EBEBEB]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="h-8 text-xs font-semibold"
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
        <div>
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
                    <div className="rounded-[10px] bg-[#FFF4EB] border border-[#FFE4CF] p-2.5 text-xs text-[#B35300] flex items-center justify-between shadow-2xs animate-fade-in">
                      <div className="space-y-0.5">
                        <span className="font-bold flex items-center gap-1 text-[#121212]">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#B35300] shrink-0" /> Payment Pending: {formatCurrency(Number(ticket.balanceAmount))}
                        </span>
                        <p className="text-[#767676]">Clear remaining balance before device handover.</p>
                      </div>
                      {user?.role !== "TECHNICIAN" && (
                        <button
                          type="button"
                          onClick={() => scrollToPaymentSection(true)}
                          className="rounded-[8px] bg-[#121212] hover:bg-black px-2.5 py-1 text-white font-semibold transition-colors shrink-0 ml-2 shadow-2xs cursor-pointer"
                        >
                          Record Payment ↓
                        </button>
                      )}
                    </div>
                  )}

                  {paymentWarning && (
                    <Alert variant="warning" className="border-[#FFE4CF] bg-[#FFF4EB] text-[#B35300] flex items-start gap-2 text-xs py-2">
                      <AlertTriangle className="h-4 w-4 text-[#B35300] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-[#121212]">{paymentWarning}</p>
                        {user?.role !== "TECHNICIAN" && Number(ticket.balanceAmount) > 0 && (
                          <button
                            type="button"
                            onClick={() => scrollToPaymentSection(true)}
                            className="mt-1 font-bold underline hover:text-[#121212] cursor-pointer"
                          >
                            Jump to Record Payment section ↓
                          </button>
                        )}
                      </div>
                    </Alert>
                  )}

                  {paymentSuccessMsg && (
                    <div className="rounded-[10px] bg-[#EAF6EE] border border-[#D0ECD9] p-2 text-xs text-[#0E8345] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0E8345] shrink-0" />
                      <span className="font-medium text-[#121212]">{paymentSuccessMsg}</span>
                    </div>
                  )}

                  {nextStatus === "READY_FOR_PICKUP" && (
                    <div className="rounded-[10px] bg-[#EAF6EE] border border-[#D0ECD9] p-2.5 text-xs flex items-center justify-between text-[#0E8345]">
                      <span>Ready for Pickup alert template ready</span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp("pickup")}
                        className="font-bold underline hover:text-[#0B6B38] flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="h-3 w-3" /> Preview WhatsApp
                      </button>
                    </div>
                  )}

                  {nextStatus === "WAITING_FOR_APPROVAL" && (
                    <div className="rounded-[10px] bg-[#FFF4EB] border border-[#FFE4CF] p-3 space-y-2.5 text-xs text-[#B35300] animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#121212] flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-[#B35300]" />
                          Estimate Approval Required
                        </span>
                        <button
                          type="button"
                          onClick={() => openWhatsApp("estimate")}
                          className="font-bold underline hover:text-[#121212] flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="h-3 w-3" /> Preview WhatsApp
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#121212] block">
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
                          className="bg-white border-[#EBEBEB]"
                        />
                        {approvalEstimateCost && !isNaN(Number(approvalEstimateCost)) && (
                          <div className="text-[11px] space-y-0.5">
                            <p className="text-[#767676]">
                              New balance will be: <strong className="text-[#121212]">{formatCurrency(Math.max(0, Number(approvalEstimateCost) - Number(ticket.advancePaid)))}</strong>
                            </p>
                            {Number(approvalEstimateCost) < Number(ticket.advancePaid) && (
                              <p className="text-[#C5221F] font-semibold">
                                Cannot be less than advance already paid ({formatCurrency(Number(ticket.advancePaid))})
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#FFE4CF]">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-[#121212] text-xs block">
                            Warranty Period to Offer Customer:
                          </label>
                          <span className="text-xs font-semibold text-[#0E8345]">
                            {approvalWarrantyDays > 0 ? `${approvalWarrantyDays} Days` : "No Warranty"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {WARRANTY_OPTIONS.map((w) => (
                            <button
                              key={w.days}
                              type="button"
                              onClick={() => setApprovalWarrantyDays(w.days)}
                              className={`rounded-[8px] border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                approvalWarrantyDays === w.days
                                  ? "border-[#121212] bg-[#121212] text-white shadow-2xs"
                                  : "border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F7F7F8]"
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
                    <div className="space-y-2 rounded-[10px] bg-[#F7F7F8] border border-[#EBEBEB] p-3 text-xs text-[#121212] animate-fade-in">
                      <label className="font-semibold text-[#121212] block">Reason for returning unrepaired:</label>
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
                      <div className="rounded-[8px] bg-[#FFF4EB] border border-[#FFE4CF] p-2 text-[#B35300] space-y-0.5">
                        <p className="font-semibold text-[#121212]">Cost & Advance Settlement:</p>
                        <p className="text-xs">
                          Total repair cost will be set to ₹0.
                          {Number(ticket.advancePaid) > 0 ? (
                            <strong className="text-[#121212]"> Advance of {formatCurrency(Number(ticket.advancePaid))} will be marked as refunded to customer.</strong>
                          ) : (
                            " No advance was collected."
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    className="w-full h-10 text-xs font-semibold"
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
                    <div className="rounded-[10px] bg-[#EAF6EE] border border-[#D0ECD9] p-2.5 text-xs flex items-center justify-between text-[#0E8345] animate-fade-in">
                      <span>Status updated!</span>
                      <button
                        type="button"
                        onClick={() => { openWhatsApp("pickup"); setJustUpdatedStatus(""); }}
                        className="font-semibold bg-[#0E8345] text-white px-2.5 py-1 rounded-[6px] hover:bg-[#0B6B38] flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Send Pickup WhatsApp
                      </button>
                    </div>
                  )}

                  {justUpdatedStatus === "WAITING_FOR_APPROVAL" && (
                    <div className="rounded-[10px] bg-[#FFF4EB] border border-[#FFE4CF] p-2.5 text-xs flex items-center justify-between text-[#B35300] animate-fade-in">
                      <span>Status updated!</span>
                      <button
                        type="button"
                        onClick={() => { openWhatsApp("estimate"); setJustUpdatedStatus(""); }}
                        className="font-semibold bg-[#121212] text-white px-2.5 py-1 rounded-[6px] hover:bg-black flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Send Estimate to Customer
                      </button>
                    </div>
                  )}

                  {justUpdatedStatus === "RETURNED_UNREPAIRED" && (
                    <div className="rounded-[10px] bg-[#F7F7F8] border border-[#EBEBEB] p-2.5 text-xs flex items-center justify-between text-[#121212] animate-fade-in">
                      <span>Device marked as Returned Unrepaired. Cost set to ₹0.</span>
                      <button
                        type="button"
                        onClick={() => { openWhatsApp("auto"); setJustUpdatedStatus(""); }}
                        className="font-semibold bg-[#121212] text-white px-2.5 py-1 rounded-[6px] hover:bg-black flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Send Return Notice
                      </button>
                    </div>
                  )}
                </>
              ) : ticket.status === "DELIVERED" ? (
                <div className="rounded-[12px] border border-[#D0ECD9] bg-[#EAF6EE] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0E8345] text-white shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#121212]">Repair Delivered & Handed Over</p>
                        <p className="text-xs text-[#767676]">
                          {ticket.deliveredAt ? `Delivered on ${formatDateTime(ticket.deliveredAt)}` : "Order settled"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "rounded-[8px] p-3 text-xs border space-y-1",
                    isEligibleForFree
                      ? "bg-white border-[#D0ECD9] text-[#121212] shadow-2xs"
                      : "bg-[#FFF4EB] border-[#FFE4CF] text-[#B35300]"
                  )}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {isEligibleForFree ? (
                        <>
                          <span className="flex h-2 w-2 rounded-full bg-[#0E8345]" />
                          <span>Within 7-Day Free Service Guarantee (₹0 Charge)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-[#B35300]" />
                          <span>Beyond 7-Day Guarantee Window</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed text-[#767676]">
                      {daysSinceDelivery !== null ? (
                        daysSinceDelivery === 0
                          ? "Delivered today. If the customer encounters any recurring problem, accept for free quality re-check."
                          : `Delivered ${daysSinceDelivery} day${daysSinceDelivery === 1 ? "" : "s"} ago. ${
                              isEligibleForFree
                                ? "Covered by our 7-day assurance. Free check applies for recurring issues."
                                : "Standard diagnosis or new estimate applies."
                            }`
                      ) : "Free re-check applies within 7 days of delivery."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (!recheckReason) {
                        setRecheckReason(isEligibleForFree ? "7-Day Free Re-Check" : "Post-Delivery Rework");
                      }
                      setRecheckModalOpen(true);
                    }}
                    className="w-full h-10 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Accept Device for Re-Check / Rework
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-[#767676]">This repair is complete.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Device info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Device Details</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-xs sm:grid-cols-2">
            {ticket.imei && <p><span className="text-[#767676]">IMEI:</span> <span className="font-mono">{ticket.imei}</span></p>}
            {ticket.color && <p><span className="text-[#767676]">Color:</span> {ticket.color}</p>}
            <p className="sm:col-span-2"><span className="text-[#767676]">Problem:</span> {ticket.problemDescription || "—"}</p>
          </CardContent>
        </Card>

        {/* Device Photos & Shelf ID */}
        <DevicePhotoGallery
          ticketId={ticket.id}
          brand={ticket.brand}
          model={ticket.model}
          color={ticket.color}
          photos={ticket.photos || []}
          onPhotosUpdated={load}
          canEdit={ticket.status !== "DELIVERED" && ticket.status !== "RETURNED_UNREPAIRED"}
        />

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
            <Button variant="primary" onClick={addNote}>Add</Button>
          </CardContent>
        </Card>

        {user?.role !== "TECHNICIAN" && (
          <div ref={paymentSectionRef} id="record-payment-section" className="scroll-mt-6">
            <Card
              className={cn(
                "transition-all duration-300",
                highlightPayment && "ring-2 ring-[#121212] border-[#121212] shadow-md bg-[#F7F7F8]"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Record Payment</CardTitle>
                {Number(ticket.balanceAmount) > 0 ? (
                  <Badge variant="warning">
                    Pending Balance: {formatCurrency(Number(ticket.balanceAmount))}
                  </Badge>
                ) : (
                  <Badge variant="success">
                    Paid in Full ✓
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {highlightPayment && (
                  <div className="rounded-[8px] bg-[#FFF4EB] border border-[#FFE4CF] p-2.5 text-xs text-[#B35300] font-medium flex items-center justify-between">
                    <span>Complete pending payment of {formatCurrency(Number(ticket.balanceAmount))} below:</span>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Number(ticket.balanceAmount)))}
                      className="font-bold underline text-[#121212] cursor-pointer"
                    >
                      Fill ₹{ticket.balanceAmount}
                    </button>
                  </div>
                )}

                {paymentSuccessMsg && (
                  <div className="rounded-[8px] bg-[#EAF6EE] border border-[#D0ECD9] p-2.5 text-xs text-[#0E8345] flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-[#0E8345] shrink-0" />
                      {paymentSuccessMsg}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs border border-[#EBEBEB] font-semibold cursor-pointer"
                        onClick={() => openWhatsApp("general")}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Send WhatsApp Update
                      </Button>
                      {Number(ticket.balanceAmount) <= 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          className="h-7 text-xs font-semibold cursor-pointer"
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
                className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#121212] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                Claim Job
              </button>
            )}

            {ticket.status === "DEVICE_RECEIVED" && (
              <>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("REPAIR_IN_PROGRESS")}
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#121212] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Start Repair
                </button>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("WAITING_FOR_APPROVAL")}
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-semibold text-[#121212] hover:bg-[#F7F7F8] active:scale-95 touch-target cursor-pointer"
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
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#0E8345] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready for Pickup
                </button>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("WAITING_FOR_PARTS")}
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-semibold text-[#121212] hover:bg-[#F7F7F8] active:scale-95 touch-target cursor-pointer"
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
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#121212] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Resume Repair
                </button>
                <button
                  type="button"
                  onClick={() => quickUpdateStatus("READY_FOR_PICKUP")}
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#0E8345] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
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
                    className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#121212] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
                  >
                    Collect Balance ({formatCurrency(Number(ticket.balanceAmount))})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => quickUpdateStatus("DELIVERED")}
                    className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#0E8345] px-4 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hand Over & Deliver
                  </button>
                )}
              </>
            )}

            {ticket.status === "DELIVERED" && (
              <div className="flex items-center gap-1.5">
                <span className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[#EAF6EE] px-3 py-1.5 text-xs font-bold text-[#0E8345]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8345]" />
                  Delivered ✓
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!recheckReason) {
                      setRecheckReason(isEligibleForFree ? "7-Day Free Re-Check" : "Post-Delivery Rework");
                    }
                    setRecheckModalOpen(true);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#121212] hover:bg-[#222222] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 touch-target cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-Check / Return
                </button>
              </div>
            )}
          </div>

          {/* Row 2: Secondary Quick-Touch Bench Actions */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#EBEBEB]">
            <button
              type="button"
              onClick={() => openWhatsApp("auto")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#EAF6EE] px-2 py-2 text-xs font-semibold text-[#0E8345] hover:bg-[#d8eedf] active:scale-95 touch-target cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
            <a
              href={`tel:${ticket.customer.mobile}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#F0F0F2] px-2 py-2 text-xs font-semibold text-[#121212] hover:bg-[#EBEBEB] active:scale-95 touch-target"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setNewEstimateCost(ticket.estimatedCost && Number(ticket.estimatedCost) > 0 ? String(ticket.estimatedCost) : "");
                setNewEstimateRemarks("");
                setNewEstimateWarrantyDays(ticket.warrantyDays ?? 0);
                setEditingEstimate(true);
                setTimeout(() => {
                  estimateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 120);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#F0F0F2] px-2 py-2 text-xs font-semibold text-[#121212] hover:bg-[#EBEBEB] active:scale-95 touch-target cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              <span>Quote</span>
            </button>
            {Number(ticket.balanceAmount) > 0 && (
              <button
                type="button"
                onClick={() => scrollToPaymentSection(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#FFF4EB] px-2 py-2 text-xs font-semibold text-[#B35300] hover:bg-[#ffe3cf] active:scale-95 touch-target cursor-pointer"
              >
                <span>Pay ₹</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Re-Check & Quality Rework Modal */}
      {recheckModalOpen && ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-[12px] bg-white p-5 shadow-2xl border border-[#EBEBEB] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#EBEBEB] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212] shrink-0">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#121212]">Device Return / Quality Re-Check</h3>
                  <p className="text-[11px] text-[#767676] font-mono">{ticket.trackingNumber} · {ticket.brand} {ticket.model}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecheckModalOpen(false)}
                className="text-[#767676] hover:text-[#121212] rounded-lg p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Guarantee / 7-Day Assurance banner */}
            <div className={cn(
              "rounded-[10px] p-3 text-xs border space-y-1",
              isEligibleForFree
                ? "bg-[#E6F4EA] border-[#0E8345]/20 text-[#0E8345]"
                : "bg-[#FEF7E0] border-[#B35300]/20 text-[#B35300]"
            )}>
              <div className="flex items-center gap-1.5 font-bold">
                {isEligibleForFree ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#0E8345] shrink-0" />
                    <span>Eligible for 7-Day Free Re-Check (₹0 Charge)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-[#B35300] shrink-0" />
                    <span>Post-Delivery Rework (Beyond 7-Day Window)</span>
                  </>
                )}
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {daysSinceDelivery !== null && `Delivered ${daysSinceDelivery} day${daysSinceDelivery === 1 ? "" : "s"} ago. `}
                {isEligibleForFree
                  ? "Under shop assurance, recurring issues are inspected free of charge without creating a new booking."
                  : "You may specify an additional estimate if new replacement parts or fresh diagnosis apply."}
              </p>
            </div>

            {/* Issue Category selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">
                Issue Category *
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecheckReasonType("SAME_ISSUE");
                    setRecheckCost("0");
                    if (!recheckReason || recheckReason.startsWith("New issue")) {
                      setRecheckReason("7-Day Free Re-Check: Recurring fault / parts quality issue");
                    }
                  }}
                  className={cn(
                    "rounded-[10px] border p-3 text-left transition-all cursor-pointer flex flex-col justify-between",
                    recheckReasonType === "SAME_ISSUE"
                      ? "border-[#121212] bg-[#F7F7F8] shadow-2xs ring-1 ring-[#121212]"
                      : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#121212]">Same / Recurring Issue</span>
                    {isEligibleForFree && (
                      <span className="rounded bg-[#E6F4EA] px-1.5 py-0.5 text-[10px] font-bold text-[#0E8345]">
                        FREE ₹0
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#767676] mt-1">Screen flicker, touch issue, loose port, same fault</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecheckReasonType("NEW_ISSUE");
                    if (!recheckReason || recheckReason.startsWith("7-Day Free")) {
                      setRecheckReason("New issue or customer-induced damage");
                    }
                  }}
                  className={cn(
                    "rounded-[10px] border p-3 text-left transition-all cursor-pointer flex flex-col justify-between",
                    recheckReasonType === "NEW_ISSUE"
                      ? "border-[#121212] bg-[#F7F7F8] shadow-2xs ring-1 ring-[#121212]"
                      : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#121212]">New / Secondary Issue</span>
                    <span className="rounded bg-[#FEF7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#B35300]">
                      Chargeable
                    </span>
                  </div>
                  <p className="text-[11px] text-[#767676] mt-1">Fresh physical drop, liquid spill, or unrelated new fault</p>
                </button>
              </div>
            </div>

            {/* Quick Reason chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#121212]">Quick Reason</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Touch not responding / ghost touches",
                  "Display flickering / black screen",
                  "Battery draining quickly",
                  "Charging port loose / slow charging",
                  "Speaker / Mic not clear",
                  "Physical drop / damage by customer",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setRecheckReason(preset);
                      if (!recheckRemarks) setRecheckRemarks(preset);
                    }}
                    className="rounded-[8px] border border-[#EBEBEB] bg-[#F7F7F8] px-2.5 py-1 text-[11px] font-medium text-[#121212] hover:bg-[#EBEBEB] transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Complaint Remarks */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#121212]">
                Customer Complaint Notes *
              </label>
              <Textarea
                rows={3}
                placeholder="Describe exact symptoms reported by the customer..."
                value={recheckRemarks}
                onChange={(e) => setRecheckRemarks(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Additional Charge (if applicable) */}
            {recheckReasonType === "NEW_ISSUE" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#121212]">
                  Additional Estimate Cost (₹)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={recheckCost}
                  onChange={(e) => setRecheckCost(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-[#767676]">Leave 0 if diagnosing before providing quote.</p>
              </div>
            )}

            {/* Technician Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#121212]">
                Assign Technician
              </label>
              <select
                className={selectClassName}
                value={recheckTechId}
                onChange={(e) => setRecheckTechId(e.target.value)}
              >
                <option value="">
                  {ticket.assignedTechnicianName
                    ? `Keep ${ticket.assignedTechnicianName} (Original Technician)`
                    : "Unassigned"}
                </option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.id === ticket.assignedTechnicianId ? "(Original)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {recheckError && (
              <p className="text-xs text-[#C5221F] bg-[#FDE8E8] p-2 rounded-[8px] font-medium">
                {recheckError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBEBEB]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecheckModalOpen(false)}
                disabled={submittingRecheck}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#121212] hover:bg-[#262626] text-white font-semibold rounded-[10px]"
                disabled={submittingRecheck || !recheckRemarks.trim()}
                onClick={handleReopenTicket}
              >
                {submittingRecheck ? "Reopening..." : "Confirm & Reopen for Re-Check"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hand Over & Delivery Verification Modal */}
      {ticket && (
        <DeliveryVerificationModal
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          ticket={ticket}
          onConfirmDelivery={handleConfirmDeliveryFromModal}
          onQuickUploadPhoto={handleQuickUploadPhoto}
        />
      )}
    </StaffLayout>
  );
}
