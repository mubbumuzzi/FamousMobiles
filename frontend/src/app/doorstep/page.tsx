"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { PageLoading } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { cn, formatCurrency } from "@/lib/utils";

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

function getCustFmApiUrl(): string {
  if (typeof window !== "undefined") {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocalhost) {
      return "http://localhost:8081/api";
    }
    return "http://13.140.146.12:8080/api";
  }
  return "http://127.0.0.1:8081/api";
}

export default function DoorstepPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthGuard();

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

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } else {
        setError(`Failed to fetch enquiries (HTTP ${res.status}). Ensure CustFM backend is running.`);
      }
    } catch (err: unknown) {
      console.warn("Could not reach CustFM backend:", err);
      setError("Unable to connect to customer booking server on port 8081.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchBookings();
    }
  }, [authLoading, user]);

  const updateBooking = async (bookingId: string, updates: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings/${bookingId}/pos-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

                    <div className="text-[12px] text-[#767676]">
                      {new Date(b.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                    <div className="flex items-center gap-2">
                      {/* Step Forward Action */}
                      {b.currentStageIndex < 10 && (
                        <button
                          type="button"
                          onClick={() => updateBooking(b.bookingId, { stageIndex: b.currentStageIndex + 1 })}
                          disabled={isUpdating}
                          className="h-8 px-3 rounded-[8px] bg-[#121212] hover:bg-black text-white text-[12px] font-bold transition-all flex items-center gap-1 active:scale-95"
                        >
                          <span>Advance Stage ➔</span>
                        </button>
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
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveBookingId(null)}
                          className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-[#767676]"
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
                          className="px-4 py-1.5 rounded-[8px] bg-[#121212] text-white text-[12px] font-bold hover:bg-black transition-colors"
                        >
                          {isUpdating ? "Saving..." : "Save Assignment & Quote"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
