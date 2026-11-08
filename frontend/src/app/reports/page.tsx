"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Download,
  Calendar,
  Wrench,
  Package,
  Printer,
  FileText,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { getApiUrl, getAccessToken, api, getCachedApi } from "@/lib/api";
import { useStore } from "@/context/StoreContext";
import { formatCurrency, cn } from "@/lib/utils";

interface ReportSummary {
  totalTickets: number;
  deliveredCount: number;
  inProgressCount: number;
  readyCount: number;
  totalCost: number;
  totalAdvance: number;
  totalBalance: number;
}

const PRESET_RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_30_days", label: "Last 30 Days" },
  { id: "last_month", label: "Last Month" },
  { id: "all_time", label: "All Time" },
];

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "DELIVERED", label: "Delivered Only" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "REPAIR_IN_PROGRESS", label: "In Progress" },
  { value: "DEVICE_RECEIVED", label: "Received Only" },
  { value: "RETURNED_UNREPAIRED", label: "Returned" },
];

function getPresetDates(id: string): { from: string; to: string } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  switch (id) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "yesterday": {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      return { from: yStr, to: yStr };
    }
    case "this_week": {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { from: monday.toISOString().slice(0, 10), to: todayStr };
    }
    case "this_month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first.toISOString().slice(0, 10), to: todayStr };
    }
    case "last_30_days": {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().slice(0, 10), to: todayStr };
    }
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
    }
    case "all_time":
      return { from: "2026-01-01", to: todayStr };
    default:
      return { from: todayStr, to: todayStr };
  }
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const { activeStoreId, activeStore } = useStore();

  // Default to Last 30 Days so staff immediately see active repair records
  const initialRange = getPresetDates("last_30_days");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [activePreset, setActivePreset] = useState("last_30_days");
  const [statusFilter, setStatusFilter] = useState("");

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSummary = useCallback(async () => {
    if (!from || !to) return;
    const storeParam = activeStoreId !== "ALL" ? `&storeId=${activeStoreId}` : "";
    const statusParam = statusFilter ? `&status=${statusFilter}` : "";
    const key = `/reports/repairs/summary?from=${from}&to=${to}${statusParam}${storeParam}`;
    if (!getCachedApi(key)) {
      setLoadingSummary(true);
    }
    try {
      const data = await api<ReportSummary>(key);
      setSummary(data);
    } catch {
      // Graceful fallback if summary fails
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [from, to, statusFilter, activeStoreId]);

  useEffect(() => {
    if (!authLoading && user && user.role === "ADMIN") {
      loadSummary();
    }
  }, [authLoading, user, loadSummary]);

  const handleSelectPreset = (id: string) => {
    setActivePreset(id);
    const range = getPresetDates(id);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleDownload = async (path: string, filename: string, typeKey: string) => {
    try {
      setDownloadingType(typeKey);
      setError("");
      setSuccess("");

      const blob = await api<Blob>(path);

      if (blob.type && blob.type.includes("json")) {
        const text = await blob.text();
        let msg = "Download failed";
        try {
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch {
          msg = text;
        }
        throw new Error(msg);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 2000);

      setSuccess(`Downloaded ${filename} successfully!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setDownloadingType(null);
    }
  };

  const handlePreviewPdf = async (path: string) => {
    try {
      setDownloadingType("preview-pdf");
      setError("");
      setSuccess("");

      const blob = await api<Blob>(path);

      if (blob.type && blob.type.includes("json")) {
        throw new Error("Could not load PDF document from server.");
      }

      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview PDF");
    } finally {
      setDownloadingType(null);
    }
  };

  if (authLoading) return null;

  if (user?.role !== "ADMIN") {
    return (
      <StaffLayout userName={user?.fullName} role={user?.role}>
        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-8 text-center text-[#121212]">
          <h2 className="text-base font-bold">Admin Permission Required</h2>
          <p className="mt-1 text-xs text-[#767676]">
            Only store administrators can generate financial summaries and audit reports.
          </p>
        </div>
      </StaffLayout>
    );
  }

  const storeQuery = activeStoreId !== "ALL" ? `&storeId=${activeStoreId}` : "";
  const statusQuery = statusFilter ? `&status=${statusFilter}` : "";
  const storeLabel = activeStoreId === "ALL" ? "All Branches" : activeStore?.displayName || "Main Branch";

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 max-w-4xl animate-fade-in text-[#121212]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">
              Reports &amp; Analytics
            </h1>
            <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
              Export comprehensive repair sheets, customer accounts, and inventory stock audits
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#F0F0F2] px-2.5 py-1 text-xs font-semibold text-[#121212]">
              {storeLabel}
            </span>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2 rounded-[10px] border border-[#FEE2E2] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C] animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-[10px] border border-[#EAF6EE] bg-[#F2FAF5] p-3 text-xs text-[#0E8345] animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Preset Range Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {PRESET_RANGES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={cn(
                "h-8 px-3 rounded-[8px] font-medium transition-all cursor-pointer whitespace-nowrap",
                activePreset === preset.id
                  ? "bg-[#121212] text-white shadow-2xs font-semibold"
                  : "bg-[#F0F0F2] text-[#121212] hover:bg-[#EBEBEB]"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Range & Status Filters */}
        <Card className="rounded-[12px] border border-[#EBEBEB] bg-white shadow-2xs">
          <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-[11px] font-medium text-[#767676] mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>From Date</span>
              </Label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset("");
                }}
                className="h-10 w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 text-xs text-[#121212] focus:border-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] transition-colors"
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium text-[#767676] mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>To Date</span>
              </Label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset("");
                }}
                className="h-10 w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 text-xs text-[#121212] focus:border-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] transition-colors"
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium text-[#767676] mb-1.5 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                <span>Status Scope</span>
              </Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full rounded-[8px] border border-[#EBEBEB] bg-white px-2.5 text-xs text-[#121212] focus:border-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] transition-colors"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Live Filter Summary Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#767676]">Matching Tickets</p>
            <p className="mt-1 text-lg font-bold text-[#121212]">
              {loadingSummary ? "..." : summary?.totalTickets ?? 0}
            </p>
            <p className="text-[10px] text-[#767676] mt-0.5">
              {summary ? `${summary.deliveredCount} delivered` : "In date range"}
            </p>
          </div>

          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#767676]">Total Estimated Billing</p>
            <p className="mt-1 text-lg font-bold text-[#121212]">
              {loadingSummary ? "..." : formatCurrency(Number(summary?.totalCost ?? 0))}
            </p>
            <p className="text-[10px] text-[#767676] mt-0.5">Across tickets</p>
          </div>

          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#767676]">Advance Collected</p>
            <p className="mt-1 text-lg font-bold text-[#0E8345]">
              {loadingSummary ? "..." : formatCurrency(Number(summary?.totalAdvance ?? 0))}
            </p>
            <p className="text-[10px] text-[#767676] mt-0.5">Received cash/UPI</p>
          </div>

          <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-[#767676]">Outstanding Balance</p>
            <p className="mt-1 text-lg font-bold text-[#B35300]">
              {loadingSummary ? "..." : formatCurrency(Number(summary?.totalBalance ?? 0))}
            </p>
            <p className="text-[10px] text-[#767676] mt-0.5">Pending collection</p>
          </div>
        </div>

        {/* Organized Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card 1: Repair Report */}
          <div className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212]">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#121212]">Repairs &amp; Service Log</h3>
                    <p className="text-[11px] text-[#767676]">Filtered by selected dates &amp; branch</p>
                  </div>
                </div>
                <span className="rounded-[4px] bg-[#F0F0F2] px-2 py-0.5 text-[10px] font-semibold text-[#121212]">
                  PDF &amp; Excel
                </span>
              </div>

              <p className="mt-3 text-xs text-[#767676] leading-relaxed">
                Detailed report containing tracking tokens, customer mobile numbers, device models, issue descriptions, technician assignments, and payment balance due.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#EBEBEB] flex flex-wrap items-center gap-2">
              {/* PDF Download */}
              <Button
                variant="primary"
                size="sm"
                disabled={Boolean(downloadingType)}
                onClick={() =>
                  handleDownload(
                    `/reports/repairs?from=${from}&to=${to}${statusQuery}${storeQuery}&format=pdf`,
                    `repairs-${from}-to-${to}.pdf`,
                    "repair-pdf"
                  )
                }
                className="cursor-pointer gap-1.5 h-8.5 text-xs flex-1 min-w-[120px]"
              >
                {downloadingType === "repair-pdf" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>Download PDF</span>
              </Button>

              {/* PDF Preview / Print */}
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(downloadingType)}
                onClick={() =>
                  handlePreviewPdf(
                    `/reports/repairs?from=${from}&to=${to}${statusQuery}${storeQuery}&format=pdf`
                  )
                }
                className="cursor-pointer gap-1.5 h-8.5 text-xs text-[#121212] border-[#EBEBEB] hover:bg-[#F7F7F8]"
                title="Preview and print directly"
              >
                {downloadingType === "preview-pdf" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5" />
                )}
                <span>Print</span>
              </Button>

              {/* Excel Download */}
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(downloadingType)}
                onClick={() =>
                  handleDownload(
                    `/reports/repairs?from=${from}&to=${to}${statusQuery}${storeQuery}&format=xlsx`,
                    `repairs-${from}-to-${to}.xlsx`,
                    "repair-excel"
                  )
                }
                className="cursor-pointer gap-1.5 h-8.5 text-xs text-[#121212] border-[#EBEBEB] hover:bg-[#F7F7F8] flex-1 min-w-[120px]"
              >
                {downloadingType === "repair-excel" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                <span>Download Excel</span>
              </Button>
            </div>
          </div>

          {/* Card 2: Inventory & Stock Report */}
          <div className="flex flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212]">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#121212]">Inventory &amp; Parts Stock</h3>
                    <p className="text-[11px] text-[#767676]">All workshop inventory items</p>
                  </div>
                </div>
                <span className="rounded-[4px] bg-[#F0F0F2] px-2 py-0.5 text-[10px] font-semibold text-[#121212]">
                  Excel (.xlsx)
                </span>
              </div>

              <p className="mt-3 text-xs text-[#767676] leading-relaxed">
                Complete inventory valuation spreadsheet listing all spare parts, SKUs, in-stock quantities, cost prices, selling prices, and low stock threshold alerts.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#EBEBEB]">
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(downloadingType)}
                onClick={() =>
                  handleDownload(
                    `/reports/inventory?format=xlsx`,
                    `inventory-stock-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    "inventory-excel"
                  )
                }
                className="w-full cursor-pointer gap-1.5 h-8.5 text-xs text-[#121212] border-[#EBEBEB] hover:bg-[#F7F7F8]"
              >
                {downloadingType === "inventory-excel" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                <span>Download Stock Sheet (Excel)</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
