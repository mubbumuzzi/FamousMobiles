"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Download, Phone, Printer, User, Wrench } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { StatusProgress } from "@/components/tracking/StatusProgress";
import { ActivityTimeline } from "@/components/tracking/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, selectClassName } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { API_URL, api, getAccessToken } from "@/lib/api";
import { Payment, REPAIR_STATUSES, RepairStatus, Technician, Ticket, TimelineEntry } from "@/lib/types";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";
import { isOverdue } from "@/lib/status-messages";
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
  const [remarks, setRemarks] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignId, setAssignId] = useState("");

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

  const updateStatus = async () => {
    if (!nextStatus) return;
    await api(`/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus, remarks, technicianNotes: remarks }) });
    setNextStatus(""); setRemarks(""); load();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api(`/tickets/${id}/notes`, { method: "POST", body: JSON.stringify({ content: note }) });
    setNote(""); load();
  };

  const recordPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    await api(`/tickets/${id}/payments`, { method: "POST", body: JSON.stringify({ amount, paymentMode: payMode }) });
    setPayAmount(""); load();
  };

  const assignSelf = async () => { await api(`/tickets/${id}/assign-me`, { method: "POST" }); load(); };
  const assignTechnician = async () => {
    if (!assignId) return;
    await api(`/tickets/${id}/assign`, { method: "POST", body: JSON.stringify({ technicianId: assignId }) });
    setAssignId(""); load();
  };

  const downloadReceipt = async () => {
    const res = await fetch(`${API_URL}/tickets/${id}/receipt/pdf`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!res.ok) throw new Error("Failed to download receipt");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ticket?.trackingNumber}.pdf`;
    a.click();
  };

  const printReceipt = async () => {
    const res = await fetch(`${API_URL}/tickets/${id}/receipt/pdf`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const w = window.open(URL.createObjectURL(blob));
    w?.print();
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
  const canUpdateStatus = ticket.status !== "DELIVERED" && selectableStatuses.length > 0;
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
            <a href={`tel:${ticket.customer.mobile}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4 opacity-70" />{ticket.customer.mobile}</a>
            <span className="flex items-center gap-2"><Wrench className="h-4 w-4 opacity-70" />{ticket.assignedTechnicianName ?? "Unassigned"}</span>
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 opacity-70" />EDD: {formatDate(ticket.estimatedDeliveryDate)}</span>
          </div>
          {overdue && <p className="mt-3 rounded-lg bg-red-500/30 px-3 py-1.5 text-xs font-bold">⚠ Overdue repair</p>}
          <div className="mt-4 rounded-xl bg-white/15 p-3 backdrop-blur-sm">
            <StatusProgress status={ticket.status} compact />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
                  <select className={selectClassName} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as RepairStatus)}>
                    <option value="">Select next status...</option>
                    {selectableStatuses.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
                  </select>
                  <Textarea placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
                  <Button className="w-full" onClick={updateStatus} disabled={!nextStatus}>Update Status</Button>
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
          <Card>
            <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input type="number" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-32" />
                <select className={selectClassName} value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
                <Button onClick={recordPayment}>Record</Button>
              </div>
              {payments.map((p) => (
                <p key={p.id} className="text-sm text-slate-600">{formatCurrency(Number(p.amount))} via {p.paymentMode} · {new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
}
