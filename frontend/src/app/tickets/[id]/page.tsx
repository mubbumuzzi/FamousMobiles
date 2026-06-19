"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, selectClassName } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { API_URL, api, getAccessToken } from "@/lib/api";
import { Payment, REPAIR_STATUSES, RepairStatus, Ticket, TimelineEntry } from "@/lib/types";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuthGuard();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<RepairStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");

  const load = () => {
    api<Ticket>(`/tickets/${id}`).then(setTicket).catch(console.error);
    api<TimelineEntry[]>(`/tickets/${id}/timeline`).then(setTimeline).catch(console.error);
    api<Payment[]>(`/tickets/${id}/payments`).then(setPayments).catch(console.error);
  };

  useEffect(() => { load(); }, [id]);

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
    await api(`/tickets/${id}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(payAmount), paymentMode: payMode }) });
    setPayAmount(""); load();
  };

  const downloadReceipt = async () => {
    const res = await fetch(`${API_URL}/tickets/${id}/receipt/pdf`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticket?.trackingNumber}.pdf`;
    a.click();
  };

  const printReceipt = async () => {
    const res = await fetch(`${API_URL}/tickets/${id}/receipt/pdf`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    w?.print();
  };

  if (authLoading || !ticket) return <div className="p-8">Loading...</div>;

  const currentIdx = REPAIR_STATUSES.indexOf(ticket.status);
  const nextAllowed = currentIdx < REPAIR_STATUSES.length - 1 ? REPAIR_STATUSES[currentIdx + 1] : null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">{ticket.trackingNumber}</h1>
            <p className="text-slate-600">{ticket.brand} {ticket.model}</p>
            <p className="font-medium text-slate-900">{ticket.customer.fullName}</p>
            <p className="text-slate-600">{ticket.customer.mobile}</p>
          </div>
          <Badge>{formatStatus(ticket.status)}</Badge>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadReceipt}><Download className="h-4 w-4" /> PDF</Button>
          <Button size="sm" variant="outline" onClick={printReceipt}><Printer className="h-4 w-4" /> Print</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Device & Payment</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>IMEI: {ticket.imei || "-"}</p>
              <p>Problem: {ticket.problemDescription || "-"}</p>
              <p>Estimated: {formatCurrency(Number(ticket.estimatedCost))}</p>
              <p>Advance: {formatCurrency(Number(ticket.advancePaid))}</p>
              <p>Balance: {formatCurrency(Number(ticket.balanceAmount))}</p>
              <p>EDD: {formatDate(ticket.estimatedDeliveryDate)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {nextAllowed && (
                <>
                  <select className={selectClassName} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as RepairStatus)}>
                    <option value="">Move to...</option>
                    <option value={nextAllowed}>{formatStatus(nextAllowed)}</option>
                  </select>
                  <Textarea placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <Button size="sm" onClick={updateStatus}>Update Status</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Tracking Timeline</CardTitle></CardHeader>
          <CardContent><TrackingTimeline currentStatus={ticket.status} timeline={timeline} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Activity & Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {timeline.map((e) => (
              <div key={e.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                <p className="font-medium">{e.title}</p>
                <p className="text-slate-600">{e.description}</p>
                <p className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString("en-IN")} · {e.authorName}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add note..." value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" onClick={addNote}>Add</Button>
            </div>
          </CardContent>
        </Card>

        {user?.role !== "TECHNICIAN" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input type="number" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-32" />
              <select className={selectClassName} value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
              <Button size="sm" onClick={recordPayment}>Record</Button>
              <div className="w-full mt-2 space-y-1 text-sm">
                {payments.map((p) => (
                  <p key={p.id}>{formatCurrency(Number(p.amount))} via {p.paymentMode} · {new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
}
