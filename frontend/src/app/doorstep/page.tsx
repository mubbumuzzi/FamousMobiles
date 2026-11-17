"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bike,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  UserCheck,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Wrench,
  Navigation,
  Zap,
  Bell,
  Trash2,
} from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { PageLoading } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/hooks/useAuth";
import { cn, formatCurrency } from "@/lib/utils";
import { getCustFmApiUrl } from "@/lib/doorstep-sync";

interface StageInfo {
  index: number;
  name: string;
  completed: boolean;
  active: boolean;
}

interface DoorstepBooking {
  bookingId: string;
  statusCode: string;
  statusLabel: string;
  currentStageIndex: number;
  totalStages: number;
  customerName: string;
  mobileNumber: string;
  brandModel: string;
  repairCategory: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  visitCharge: number;
  firstVisitFree: boolean;
  technicianName?: string | null;
  technicianPhone?: string | null;
  etaMinutes?: string | null;
  quoteAmount?: number | null;
  quoteApproved?: boolean;
  handshakeOtp?: string | null;
  stages: StageInfo[];
  createdAt: string;
  updatedAt: string;
}

const STAGE_OPTIONS = [
  { index: 0, label: "0. New Enquiry Logged" },
  { index: 1, label: "1. Customer Contacted" },
  { index: 2, label: "2. Appointment Confirmed" },
  { index: 3, label: "3. Technician Assigned" },
  { index: 4, label: "4. Part Collected from Manikonda Hub" },
  { index: 5, label: "5. Technician On The Way" },
  { index: 6, label: "6. Technician Arrived at Doorstep" },
  { index: 7, label: "7. Diagnosis Completed" },
  { index: 8, label: "8. Awaiting Customer Approval" },
  { index: 9, label: "9. Repair In Progress" },
  { index: 10, label: "10. Completed & Closed" },
];

export default function DoorstepPage() {
  const router = useRouter();
  const { user, loading: authLoading, canAccessDoorstep } = useAuthGuard();

  const [bookings, setBookings] = useState<DoorstepBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "NEW" | "DISPATCHED" | "APPROVAL" | "COMPLETED">("ALL");

  // Inline action modal state
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [techName, setTechName] = useState("Ramesh K.");
  const [techPhone, setTechPhone] = useState("9063786751");
  const [quoteInput, setQuoteInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Customer Handshake Completion OTP State (Zomato/Swiggy Model)
  const [handshakeModalBooking, setHandshakeModalBooking] = useState<DoorstepBooking | null>(null);
  const [handshakeInputOtp, setHandshakeInputOtp] = useState(["", "", "", ""]);
  const [handshakeError, setHandshakeError] = useState("");
  const [isVerifyingHandshake, setIsVerifyingHandshake] = useState(false);
  const [handshakeSuccessMsg, setHandshakeSuccessMsg] = useState("");

  // Real-time audio alert & incoming intake banner
  const [newOrderAlert, setNewOrderAlert] = useState<{ id: string; name: string; model: string } | null>(null);
  const lastCountRef = useRef<number | null>(null);

  const playNewOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Audio context restricted or muted
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings`, {
        headers: { "X-POS-API-KEY": "famous-pos-sec-2026" },
      });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        if (lastCountRef.current !== null && arr.length > lastCountRef.current && arr.length > 0) {
          playNewOrderChime();
          setNewOrderAlert({ id: arr[0].bookingId, name: arr[0].customerName, model: arr[0].brandModel });
        }
        lastCountRef.current = arr.length;
        setBookings(arr);
      } else {
        setError(`Failed to fetch enquiries (HTTP ${res.status}). Ensure CustFM backend is running.`);
      }
    } catch (err: unknown) {
      console.warn("Could not reach CustFM backend:", err);
      setError("Unable to connect to customer booking server on port 8080. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && canAccessDoorstep) {
      fetchBookings();
    }
  }, [authLoading, user, canAccessDoorstep]);

  const handleQuickDispatch = (booking: DoorstepBooking) => {
    updateBooking(booking.bookingId, {
      stageIndex: 3,
      technicianName: "Ramesh K.",
      technicianPhone: "9063786751",
      etaMinutes: "Dispatching (~45 mins)",
    });
  };

  const getBookingAge = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins < 1) return { text: "Just now", level: "fresh" };
    if (diffMins < 60) {
      if (diffMins < 10) return { text: `${diffMins}m ago`, level: "fresh" };
      if (diffMins < 25) return { text: `${diffMins}m ago`, level: "medium" };
      return { text: `${diffMins}m ago`, level: "urgent" };
    }
    const diffHours = Math.floor(diffMins / 60);
    return { text: `${diffHours}h ago`, level: "urgent" };
  };

  const getDistanceBadge = (b: DoorstepBooking) => {
    let km = 1.6;
    if (b.latitude && b.longitude) {
      const lat1 = 17.4022;
      const lon1 = 78.3888;
      const R = 6371;
      const dLat = ((b.latitude - lat1) * Math.PI) / 180;
      const dLon = ((b.longitude - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      km = R * c;
    }
    const mins = Math.max(5, Math.round(km * 3.5 + 4));
    return {
      distance: km < 0.2 ? "<0.2 km" : `${km.toFixed(1)} km`,
      time: `~${mins} min ride`,
    };
  };

  const updateBooking = async (bookingId: string, updates: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings/${bookingId}/pos-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-POS-API-KEY": "famous-pos-sec-2026",
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated: DoorstepBooking = await res.json();
        setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? updated : b)));
        setActiveBookingId(null);
        setQuoteInput("");
      } else {
        alert("Failed to update booking. Please retry.");
      }
    } catch (err) {
      alert("Error updating booking.");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBooking = async (booking: DoorstepBooking) => {
    const confirmMsg = `Are you sure you want to permanently delete doorstep enquiry #${booking.bookingId} (${booking.customerName} - ${booking.brandModel})?\n\nThis will remove the record from the database.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(booking.bookingId);
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings/${booking.bookingId}`, {
        method: "DELETE",
        headers: {
          "X-POS-API-KEY": "famous-pos-sec-2026",
        },
      });

      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.bookingId !== booking.bookingId));
        if (activeBookingId === booking.bookingId) {
          setActiveBookingId(null);
        }
      } else {
        const errorData = await res.json().catch(() => null);
        alert(`Failed to delete booking: ${errorData?.message || "HTTP " + res.status}`);
      }
    } catch (err) {
      alert("Error deleting booking: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerifyHandshake = async (codeToVerify?: string) => {
    if (!handshakeModalBooking) return;
    const code = (codeToVerify !== undefined ? codeToVerify : handshakeInputOtp.join("")).trim();
    if (!code || code.length < 4) {
      setHandshakeError("Please enter the complete 4-digit code.");
      return;
    }
    setHandshakeError("");
    setIsVerifyingHandshake(true);
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings/${handshakeModalBooking.bookingId}/verify-handshake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code }),
      });
      if (res.ok) {
        const updated: DoorstepBooking = await res.json();
        setBookings((prev) => prev.map((b) => (b.bookingId === handshakeModalBooking.bookingId ? updated : b)));
        setHandshakeSuccessMsg("Handshake OTP verified! Repair marked Completed & Closed.");
        setTimeout(() => {
          setHandshakeModalBooking(null);
          setHandshakeInputOtp(["", "", "", ""]);
          setHandshakeSuccessMsg("");
        }, 1200);
      } else {
        const errJson = await res.json().catch(() => null);
        setHandshakeError(errJson?.message || "Invalid 4-digit code. Please verify with customer.");
      }
    } catch (err) {
      console.error(err);
      setHandshakeError("Error connecting to server. Please try again.");
    } finally {
      setIsVerifyingHandshake(false);
    }
  };

  const handleAdvanceStage = (booking: DoorstepBooking) => {
    if (booking.currentStageIndex === 9) {
      // Require Customer Handshake OTP to transition to Stage 10 (Completed & Closed)
      setHandshakeModalBooking(booking);
      setHandshakeInputOtp(["", "", "", ""]);
      setHandshakeError("");
      setHandshakeSuccessMsg("");
      return;
    }
    updateBooking(booking.bookingId, { stageIndex: booking.currentStageIndex + 1 });
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Filter tab
      if (activeFilter === "NEW" && b.currentStageIndex > 2) return false;
      if (activeFilter === "DISPATCHED" && (b.currentStageIndex < 3 || b.currentStageIndex > 6)) return false;
      if (activeFilter === "APPROVAL" && b.currentStageIndex !== 8) return false;
      if (activeFilter === "COMPLETED" && b.currentStageIndex !== 10) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        b.bookingId.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.mobileNumber.includes(q) ||
        b.brandModel.toLowerCase().includes(q) ||
        b.repairCategory.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q)
      );
    });
  }, [bookings, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      newEnquiries: bookings.filter((b) => b.currentStageIndex <= 2).length,
      dispatched: bookings.filter((b) => b.currentStageIndex >= 3 && b.currentStageIndex <= 6).length,
      awaitingApproval: bookings.filter((b) => b.currentStageIndex === 8).length,
      completed: bookings.filter((b) => b.currentStageIndex === 10).length,
    };
  }, [bookings]);

  if (authLoading) return <PageLoading label="Loading Doorstep Portal..." />;

  if (!canAccessDoorstep) {
    return (
      <StaffLayout userName={user?.fullName} role={user?.role} doorstepEnabled={false}>
        <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
            <Bike className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#121212]">Doorstep Access Restricted</h2>
            <p className="text-sm text-[#767676] mt-1.5 leading-relaxed">
              Doorstep repairs management has not been enabled for your account ({user?.fullName || "Staff"}). Please contact an administrator to request access.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={() => router.push("/dashboard")} className="h-9 px-4 text-xs font-semibold">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </StaffLayout>
    );
  }

  const handleConvertToTicket = (booking: DoorstepBooking) => {
    const params = new URLSearchParams({
      mobile: booking.mobileNumber,
      name: booking.customerName,
      brand: booking.brandModel,
      issue: `${booking.repairCategory} (Doorstep ID: ${booking.bookingId})`,
      address: booking.address,
    });
    router.push(`/tickets/new?${params.toString()}`);
  };

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
        {/* Floating Sound Alert Banner for New Online Intakes */}
        {newOrderAlert && (
          <div className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[12px] shadow-lg flex items-center justify-between gap-3 animate-fade-in border border-blue-400">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <p className="text-[13px] font-black">
                  🔔 New Doorstep Booking Received: {newOrderAlert.id}
                </p>
                <p className="text-[12px] text-blue-100">
                  Customer: <strong>{newOrderAlert.name}</strong> • Device: <strong>{newOrderAlert.model}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery(newOrderAlert.id);
                  setNewOrderAlert(null);
                }}
                className="px-3 py-1.5 bg-white text-blue-900 rounded-[8px] text-[12px] font-black hover:bg-blue-50 transition-all shadow-xs cursor-pointer"
              >
                View Order
              </button>
              <button
                type="button"
                onClick={() => setNewOrderAlert(null)}
                className="px-2 py-1 text-white/80 hover:text-white text-[12px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EBEBEB] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#121212] text-white">
                <Bike className="h-4 w-4" />
              </div>
              <h1 className="text-[20px] font-bold tracking-tight text-[#121212]">
                Doorstep Repairs & Web Enquiries
              </h1>
              <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-bold text-[#1D4ED8] border border-blue-200">
                CustFM Live Sync
              </span>
            </div>
            <p className="text-[13px] text-[#767676] mt-1">
              Customer repair bookings submitted through the Famous Mobiles customer doorstep portal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchBookings}
              disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#EBEBEB] bg-white px-3 text-[13px] font-semibold text-[#121212] hover:bg-[#F7F7F8] active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span>{loading ? "Syncing..." : "Sync Enquiries"}</span>
            </button>

            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#121212] px-3.5 text-[13px] font-semibold text-white hover:bg-black active:scale-95 transition-all"
            >
              <span>Customer Portal ↗</span>
            </a>
          </div>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveFilter("ALL")}
            className={cn(
              "rounded-[12px] border p-3.5 transition-all cursor-pointer",
              activeFilter === "ALL" ? "border-[#121212] bg-[#F7F7F8]" : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">Total Enquiries</p>
            <p className="text-[22px] font-black text-[#121212] mt-0.5">{stats.total}</p>
            <p className="text-[11px] text-[#767676]">All-time portal bookings</p>
          </div>

          <div
            onClick={() => setActiveFilter("NEW")}
            className={cn(
              "rounded-[12px] border p-3.5 transition-all cursor-pointer",
              activeFilter === "NEW" ? "border-amber-400 bg-amber-50/50" : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Awaiting Dispatch</p>
              {stats.newEnquiries > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </div>
            <p className="text-[22px] font-black text-amber-900 mt-0.5">{stats.newEnquiries}</p>
            <p className="text-[11px] text-amber-700 font-medium">New intakes to assign</p>
          </div>

          <div
            onClick={() => setActiveFilter("DISPATCHED")}
            className={cn(
              "rounded-[12px] border p-3.5 transition-all cursor-pointer",
              activeFilter === "DISPATCHED" ? "border-blue-400 bg-blue-50/50" : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">En Route / Active</p>
            <p className="text-[22px] font-black text-blue-900 mt-0.5">{stats.dispatched}</p>
            <p className="text-[11px] text-blue-700 font-medium">Technicians on doorstep</p>
          </div>

          <div
            onClick={() => setActiveFilter("APPROVAL")}
            className={cn(
              "rounded-[12px] border p-3.5 transition-all cursor-pointer",
              activeFilter === "APPROVAL" ? "border-purple-400 bg-purple-50/50" : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
            )}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Quotes Pending</p>
            <p className="text-[22px] font-black text-purple-900 mt-0.5">{stats.awaitingApproval}</p>
            <p className="text-[11px] text-purple-700 font-medium">Awaiting customer approval</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#767676]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, mobile, model, or ID..."
              className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-[#EBEBEB] bg-white text-[13px] text-[#121212] placeholder-[#767676] focus:outline-none focus:border-[#121212]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "NEW", label: "New Enquiries" },
                { id: "DISPATCHED", label: "Dispatched" },
                { id: "APPROVAL", label: "Quote Pending" },
                { id: "COMPLETED", label: "Completed" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer",
                  activeFilter === tab.id
                    ? "bg-[#121212] text-white"
                    : "bg-white text-[#767676] border border-[#EBEBEB] hover:text-[#121212]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchBookings}
              className="font-bold underline text-red-800 hover:text-red-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Bookings List */}
        {loading && bookings.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#767676]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#121212] mb-2" />
            Loading customer bookings from CustFM...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-12 text-center space-y-2">
            <Bike className="h-8 w-8 text-[#767676] mx-auto opacity-40" />
            <p className="text-[15px] font-bold text-[#121212]">No doorstep enquiries found</p>
            <p className="text-[13px] text-[#767676] max-w-sm mx-auto">
              {searchQuery
                ? "No customer enquiries match your search query."
                : "New repair requests booked on the customer website will appear here in real-time."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredBookings.map((b) => {
              const isCardActive = activeBookingId === b.bookingId;
              const isCompleted = b.currentStageIndex === 10;
              const isApproval = b.currentStageIndex === 8;

              return (
                <div
                  key={b.bookingId}
                  className={cn(
                    "rounded-[14px] border bg-white p-4 sm:p-5 transition-all shadow-xs space-y-4",
                    isCardActive
                      ? "border-[#121212] ring-1 ring-[#121212]"
                      : isApproval
                      ? "border-purple-200 hover:border-purple-400"
                      : "border-[#EBEBEB] hover:border-[#DFDFDF]"
                  )}
                >
                  {/* Top Row: Booking ID, Status, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBEBEB] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-black text-[#121212] bg-[#F7F7F8] px-2.5 py-1 rounded-[6px] border border-[#EBEBEB]">
                        {b.bookingId}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                          b.currentStageIndex === 0
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : b.currentStageIndex <= 2
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : b.currentStageIndex <= 6
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : b.currentStageIndex === 8
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : isCompleted
                            ? "bg-green-50 text-green-800 border-green-200"
                            : "bg-[#F7F7F8] text-[#121212] border-[#EBEBEB]"
                        )}
                      >
                        Stage {b.currentStageIndex}: {b.statusLabel}
                      </span>

                      {b.firstVisitFree && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded">
                          ₹0 Free Visit
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(() => {
                        const age = getBookingAge(b.createdAt);
                        return (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1",
                              age.level === "fresh"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : age.level === "medium"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-300 font-black animate-pulse"
                            )}
                            title={`Booked at ${new Date(b.createdAt).toLocaleTimeString()}`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            <span>{age.text}</span>
                            {age.level === "urgent" && <span>• Needs Dispatch</span>}
                          </span>
                        );
                      })()}

                      <span className="text-[12px] text-[#767676]">
                        {new Date(b.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Customer Details & Device Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Customer Info Column */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">Customer</p>
                      <p className="text-[14px] font-bold text-[#121212]">{b.customerName}</p>
                      <p className="text-[13px] font-mono font-semibold text-[#555555]">
                        +91 {b.mobileNumber}
                      </p>

                      {/* 1-Tap Call & WhatsApp CTAs */}
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${b.mobileNumber}`}
                          className="flex h-7 items-center gap-1 rounded-[6px] bg-[#F7F7F8] hover:bg-[#EBEBEB] px-2 text-[11px] font-bold text-[#121212] transition-colors"
                        >
                          <Phone className="h-3 w-3 text-[#121212]" />
                          <span>Call</span>
                        </a>

                        <a
                          href={`https://wa.me/91${b.mobileNumber}?text=${encodeURIComponent(
                            `Hello ${b.customerName}, this is Famous Mobiles Manikonda regarding your repair booking (${b.bookingId}) for ${b.brandModel}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-7 items-center gap-1 rounded-[6px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 text-[11px] font-bold transition-colors"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-700" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* Device & Repair Column */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">Device & Service</p>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-[#121212]" />
                        <span className="text-[14px] font-bold text-[#121212]">{b.brandModel}</span>
                      </div>
                      <p className="text-[12px] font-semibold text-blue-700 bg-blue-50/60 px-2 py-0.5 rounded inline-block">
                        {b.repairCategory}
                      </p>
                      <p className="text-[12px] text-[#767676] line-clamp-2">
                        Preferred Arrival: <strong>{b.etaMinutes || "Earliest (~45 mins)"}</strong>
                      </p>
                    </div>

                    {/* Doorstep Location & GPS Column */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#767676]">Doorstep Address</p>
                      <div className="flex items-start gap-1.5 text-[12px] text-[#121212] font-medium leading-relaxed">
                        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{b.address}</span>
                      </div>

                      {/* Direction action & Hub coverage indicator */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={
                            b.googleMapsUrl ||
                            (b.latitude && b.longitude
                              ? `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`
                              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                  b.address.toLowerCase().includes("hyderabad")
                                    ? b.address
                                    : `${b.address}, Manikonda, Hyderabad`
                                )}`)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] text-[11px] font-bold border border-blue-200 transition-colors shadow-2xs group"
                          title="Open Google Maps Turn-by-Turn GPS Navigation for technician"
                        >
                          <Navigation className="h-3 w-3 fill-blue-600 text-blue-600 group-hover:scale-110 transition-transform" />
                          <span>Get Directions</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                        </a>

                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Manikonda Hub Coverage Area (5 km)</span>
                        </div>

                        {(() => {
                          const distInfo = getDistanceBadge(b);
                          return (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/70">
                              <Bike className="h-3 w-3 text-indigo-600" />
                              <span>{distInfo.distance} • {distInfo.time}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Stage Progress Bar (11 PRD Stages) */}
                  <div className="bg-[#F7F7F8] rounded-[10px] p-3 border border-[#EBEBEB] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-[#121212]">
                        Lifecycle Progress: Stage {b.currentStageIndex} of 10
                      </span>
                      <span className="text-[#767676] font-medium">
                        {STAGE_OPTIONS[b.currentStageIndex]?.label || b.statusLabel}
                      </span>
                    </div>

                    <div className="w-full bg-[#EBEBEB] h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#121212] h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (b.currentStageIndex / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Inline Doorstep Completion Handshake PIN Input (Stage 9) */}
                  {b.currentStageIndex === 9 && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-[10px] flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-700" />
                        <div>
                          <p className="text-[12px] font-black text-amber-900">Doorstep Handshake Completion</p>
                          <p className="text-[11px] text-amber-800">Ask customer for the 4-digit code shown on their tracking screen</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="4-digit PIN"
                          id={`pin-input-${b.bookingId}`}
                          className="w-24 h-8 px-2 text-center font-mono font-black text-[13px] tracking-widest rounded-[6px] border border-amber-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`pin-input-${b.bookingId}`) as HTMLInputElement;
                            if (input && input.value.trim().length === 4) {
                              setHandshakeModalBooking(b);
                              handleVerifyHandshake(input.value.trim());
                            } else {
                              alert("Please enter the complete 4-digit PIN from customer.");
                            }
                          }}
                          className="h-8 px-3 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all flex items-center gap-1 active:scale-95 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Verify & Close Job</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Technician & Quote Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#EBEBEB] text-[12px]">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[#767676]">Technician: </span>
                        <span className="font-bold text-[#121212]">
                          {b.technicianName || "Not assigned yet"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#767676]">Repair Quote: </span>
                        <span className="font-black text-[#121212]">
                          {b.quoteAmount ? `₹${b.quoteAmount}` : "Pending Diagnosis"}
                        </span>
                        {b.quoteApproved && (
                          <span className="ml-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1 rounded">
                            Approved by Customer
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for POS Staff */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1-Tap Quick Dispatch (Stage 0, 1, 2) */}
                      {b.currentStageIndex <= 2 && (
                        <button
                          type="button"
                          onClick={() => handleQuickDispatch(b)}
                          disabled={isUpdating}
                          className="h-8 px-3 rounded-[8px] bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
                          title="Assign Ramesh K. and advance directly to Stage 3: Technician Assigned"
                        >
                          <Bike className="h-3.5 w-3.5" />
                          <span>⚡ Quick Dispatch (Ramesh K.)</span>
                        </button>
                      )}

                      {/* 1-Tap WhatsApp Quotation Share */}
                      {b.quoteAmount && !b.quoteApproved && (
                        <a
                          href={`https://wa.me/91${b.mobileNumber}?text=${encodeURIComponent(
                            `Hello ${b.customerName}! Famous Mobiles Manikonda has completed diagnosis for your ${b.brandModel}.\n\n` +
                            `🔧 Service: ${b.repairCategory}\n` +
                            `💰 Official Repair Quote: ₹${b.quoteAmount} (Includes OEM replacement parts & 6-Month Warranty. Doorstep visit is ₹0 FREE).\n\n` +
                            `👉 Click here to review & approve the quote on your live tracker:\n` +
                            `http://localhost:3001/track-booking?id=${b.bookingId}&mobile=${b.mobileNumber}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-3 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
                          title="Send official quotation with live approval link to customer on WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>💬 WhatsApp Quote</span>
                        </a>
                      )}

                      {/* Step Forward / Complete Action */}
                      {b.currentStageIndex < 10 && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStage(b)}
                          disabled={isUpdating}
                          className={cn(
                            "h-8 px-3 rounded-[8px] text-[12px] font-bold transition-all flex items-center gap-1.5 active:scale-95",
                            b.currentStageIndex === 9
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                              : "bg-[#121212] hover:bg-black text-white"
                          )}
                        >
                          {b.currentStageIndex === 9 ? (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Verify OTP & Complete</span>
                            </>
                          ) : (
                            <span>Advance Stage ➔</span>
                          )}
                        </button>
                      )}

                      {/* Completed Verification Badge */}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          <span>Handshake Verified</span>
                        </span>
                      )}

                      {/* Open Edit/Assign Drawer */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBookingId(isCardActive ? null : b.bookingId);
                          setQuoteInput(b.quoteAmount ? String(b.quoteAmount) : "");
                        }}
                        className="h-8 px-3 rounded-[8px] border border-[#EBEBEB] bg-white hover:bg-[#F7F7F8] text-[#121212] text-[12px] font-bold transition-all"
                      >
                        {isCardActive ? "Close" : "Manage / Quote"}
                      </button>

                      {/* Convert to In-Store Ticket */}
                      <button
                        type="button"
                        onClick={() => handleConvertToTicket(b)}
                        title="Create an in-store POS repair ticket from this doorstep booking"
                        className="h-8 px-3 rounded-[8px] border border-[#EBEBEB] bg-white hover:border-[#121212] text-[#121212] text-[12px] font-bold transition-all flex items-center gap-1"
                      >
                        <Wrench className="h-3 w-3 text-[#121212]" />
                        <span>To POS Ticket</span>
                      </button>

                      {/* Delete Booking */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBooking(b)}
                        disabled={deletingId === b.bookingId}
                        title="Delete this doorstep enquiry"
                        className="h-8 px-2.5 rounded-[8px] border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-[12px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span className="hidden sm:inline">
                          {deletingId === b.bookingId ? "Deleting..." : "Delete"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Manage Drawer (Assign Tech / Update Quote / Change Stage) */}
                  {isCardActive && (
                    <div className="mt-3 p-4 rounded-[12px] bg-[#F7F7F8] border border-[#EBEBEB] space-y-4 animate-fade-in">
                      <p className="text-[13px] font-bold text-[#121212]">
                        Update Doorstep Booking: {b.bookingId}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Assign Tech */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#767676] mb-1">
                            Assign Technician
                          </label>
                          <select
                            value={techName}
                            onChange={(e) => setTechName(e.target.value)}
                            className="w-full h-9 rounded-[8px] border border-[#EBEBEB] bg-white px-2.5 text-[12px] font-bold text-[#121212]"
                          >
                            <option value="Ramesh K.">Ramesh K. (Display Specialist)</option>
                            <option value="Suresh M.">Suresh M. (Hardware Tech)</option>
                            <option value="Kiran V.">Kiran V. (Battery & Port Tech)</option>
                          </select>
                        </div>

                        {/* Set Quote */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#767676] mb-1">
                            Repair Quote Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={quoteInput}
                            onChange={(e) => setQuoteInput(e.target.value)}
                            placeholder="e.g. 2499"
                            className="w-full h-9 rounded-[8px] border border-[#EBEBEB] bg-white px-2.5 text-[12px] font-bold text-[#121212]"
                          />
                        </div>

                        {/* Set Specific Stage */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#767676] mb-1">
                            Set Lifecycle Stage
                          </label>
                          <select
                            defaultValue={b.currentStageIndex}
                            onChange={(e) => updateBooking(b.bookingId, { stageIndex: Number(e.target.value) })}
                            className="w-full h-9 rounded-[8px] border border-[#EBEBEB] bg-white px-2.5 text-[12px] font-bold text-[#121212]"
                          >
                            {STAGE_OPTIONS.map((opt) => (
                              <option key={opt.index} value={opt.index}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Save changes button */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EBEBEB]">
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(b)}
                          disabled={deletingId === b.bookingId}
                          className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Booking</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveBookingId(null)}
                            className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-[#767676] hover:bg-[#EBEBEB] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updates: Record<string, unknown> = {
                                technicianName: techName,
                                technicianPhone: techPhone,
                              };
                              if (quoteInput.trim()) {
                                updates.quoteAmount = Number(quoteInput);
                                // Setting quote moves booking to stage 8 (Awaiting Customer Approval)
                                if (b.currentStageIndex < 8) {
                                  updates.stageIndex = 8;
                                }
                              }
                              updateBooking(b.bookingId, updates);
                            }}
                            disabled={isUpdating}
                            className="px-4 py-1.5 rounded-[8px] bg-[#121212] text-white text-[12px] font-bold hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isUpdating ? "Saving..." : "Save Assignment & Quote"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Handshake Verification Modal (Zomato/Swiggy Delivery Completion Model - ₹0 Cost) */}
      {handshakeModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 shadow-2xl border border-[#EBEBEB] space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#121212]">
                    Verify Customer Handshake OTP
                  </h3>
                  <p className="text-[12px] text-[#767676]">
                    Doorstep Completion • Booking #{handshakeModalBooking.bookingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHandshakeModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-[#555555] leading-relaxed">
              Ask customer <strong className="text-[#121212]">{handshakeModalBooking.customerName}</strong> for the 4-digit completion code displayed on their live tracking screen to authorize closing this repair:
            </p>

            {/* 4 Discrete Digit Boxes */}
            <div className="flex items-center justify-center gap-3 py-2">
              {handshakeInputOtp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pos-otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const char = e.target.value.replace(/\D/g, "").slice(-1);
                    const next = [...handshakeInputOtp];
                    next[idx] = char;
                    setHandshakeInputOtp(next);
                    setHandshakeError("");
                    if (char && idx < 3) {
                      document.getElementById(`pos-otp-${idx + 1}`)?.focus();
                    }
                    if (next.join("").length === 4 && !next.includes("")) {
                      handleVerifyHandshake(next.join(""));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                      if (!handshakeInputOtp[idx] && idx > 0) {
                        const next = [...handshakeInputOtp];
                        next[idx - 1] = "";
                        setHandshakeInputOtp(next);
                        document.getElementById(`pos-otp-${idx - 1}`)?.focus();
                      } else {
                        const next = [...handshakeInputOtp];
                        next[idx] = "";
                        setHandshakeInputOtp(next);
                      }
                    }
                  }}
                  className="w-12 h-14 text-center text-2xl font-black rounded-xl border-2 border-[#DFDFDF] focus:border-[#121212] focus:ring-4 focus:ring-black/5 outline-none text-[#121212] bg-[#F7F7F8]"
                />
              ))}
            </div>

            {/* Error & Success Messages */}
            {handshakeError && (
              <p className="text-[12px] font-bold text-red-600 text-center flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{handshakeError}</span>
              </p>
            )}

            {handshakeSuccessMsg && (
              <p className="text-[12px] font-bold text-emerald-700 text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{handshakeSuccessMsg}</span>
              </p>
            )}

            {/* Fast Demo / Test Helper */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-[#767676] border-t border-[#EBEBEB]">
              <span>Demo bypass code: <strong>1234</strong></span>
              {handshakeModalBooking.handshakeOtp && (
                <button
                  type="button"
                  onClick={() => {
                    const code = handshakeModalBooking.handshakeOtp || "1234";
                    setHandshakeInputOtp(code.split(""));
                    handleVerifyHandshake(code);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Fill Customer Code ({handshakeModalBooking.handshakeOtp})
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHandshakeModalBooking(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold text-[#767676] hover:bg-[#F7F7F8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifyHandshake()}
                disabled={isVerifyingHandshake || handshakeInputOtp.join("").length < 4}
                className="px-5 py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isVerifyingHandshake ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify & Complete Repair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
