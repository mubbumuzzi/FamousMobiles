"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Printer,
  Download,
  Phone,
  MessageCircle,
  Tag,
  Loader2,
  AlertCircle,
  Store,
  Calendar,
  CheckCircle2,
  Plus,
  Minus,
  FileText,
  Receipt,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { AccessorySale, Customer, CreateAccessorySaleRequest } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { printAccessoryWarrantyBill, downloadAccessoryWarrantyBill } from "@/lib/print";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { useDebounce } from "@/hooks/useDebounce";
import { cleanMobileInput, isExact10DigitMobile, findExactCustomerMatch } from "@/lib/new-ticket-validation";
import { useStore } from "@/context/StoreContext";

interface SellAccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sale: AccessorySale) => void;
}

const WARRANTY_MONTH_PRESETS = [
  { label: "No Warranty (0m)", months: 0 },
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "12 Months (1 Yr)", months: 12 },
  { label: "24 Months (2 Yr)", months: 24 },
];

const POPULAR_ACCESSORIES = [
  { name: "Tempered Glass / UV Curved", defaultWarranty: 0, defaultPrice: "199" },
  { name: "25W Type-C Fast Charger", defaultWarranty: 6, defaultPrice: "499" },
  { name: "65W SuperVOOC Adapter", defaultWarranty: 6, defaultPrice: "899" },
  { name: "Original Type-C Cable", defaultWarranty: 3, defaultPrice: "249" },
  { name: "TWS Bluetooth Earbuds", defaultWarranty: 6, defaultPrice: "1199" },
  { name: "Protective Back Case", defaultWarranty: 0, defaultPrice: "149" },
  { name: "Original Mobile Battery", defaultWarranty: 3, defaultPrice: "899" },
];

export function SellAccessoryModal({ isOpen, onClose, onSuccess }: SellAccessoryModalProps) {
  const { activeStoreId, stores } = useStore();
  useAndroidBackButton(onClose, isOpen, 25);

  const [accessoryName, setAccessoryName] = useState("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [discount, setDiscount] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [warrantyMonths, setWarrantyMonths] = useState<number>(0);
  const [customMonths, setCustomMonths] = useState<string>("");

  const [customerMobile, setCustomerMobile] = useState("");
  const debouncedMobile = useDebounce(customerMobile, 300);
  const [customerName, setCustomerName] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state for post-sale workflow (print, whatsapp, download, next sale)
  const [completedSale, setCompletedSale] = useState<AccessorySale | null>(null);
  const [postSaleActionLoading, setPostSaleActionLoading] = useState<string | null>(null);

  // Active Store Display
  const currentStore = useMemo(() => {
    if (activeStoreId && activeStoreId !== "ALL") {
      return stores.find((s) => s.id === activeStoreId) || null;
    }
    return stores[0] || null;
  }, [activeStoreId, stores]);

  // Today's purchase date prefill
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Net Total Calculation
  const totalPrice = useMemo(() => {
    const u = parseFloat(unitPrice) || 0;
    const q = quantity || 1;
    const d = parseFloat(discount) || 0;
    const net = Math.max(0, u * q - d);
    return Math.round(net);
  }, [unitPrice, quantity, discount]);

  // Reset form when modal opens or "Next Sale" is clicked
  const resetForm = () => {
    setAccessoryName("");
    setUnitPrice("");
    setQuantity(1);
    setDiscount("0");
    setPaymentMode("UPI");
    setWarrantyMonths(0);
    setCustomMonths("");
    setCustomerMobile("");
    setCustomerName("");
    setMatchedCustomer(null);
    setSerialNumber("");
    setNotes("");
    setError(null);
    setSubmitting(false);
    setCompletedSale(null);
    setPostSaleActionLoading(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Mobile Auto-lookup
  useEffect(() => {
    const clean = customerMobile.replace(/\s+/g, "");
    if (!isExact10DigitMobile(clean)) {
      setMatchedCustomer(null);
      return;
    }

    api<Customer[]>(`/customers?q=${encodeURIComponent(clean)}`)
      .then((res) => {
        const exact = res ? findExactCustomerMatch(res, clean) : null;
        if (exact) {
          setMatchedCustomer(exact);
          if (!customerName || customerName.startsWith("Customer ")) {
            setCustomerName(exact.fullName);
          }
        } else {
          setMatchedCustomer(null);
        }
      })
      .catch(() => setMatchedCustomer(null));
  }, [debouncedMobile]);

  // Warranty Expiry Date calculation
  const warrantyExpiryDate = useMemo(() => {
    if (warrantyMonths <= 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + warrantyMonths);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }, [warrantyMonths]);

  const handleSelectPreset = (months: number) => {
    setWarrantyMonths(months);
    setCustomMonths("");
  };

  const handleCustomMonthsChange = (val: string) => {
    setCustomMonths(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setWarrantyMonths(parsed);
    }
  };

  const handlePickPopular = (item: (typeof POPULAR_ACCESSORIES)[number]) => {
    setAccessoryName(item.name);
    setUnitPrice(item.defaultPrice);
    setWarrantyMonths(item.defaultWarranty);
    setCustomMonths("");
  };

  const handleCompleteSale = async (action: "PRINT" | "DOWNLOAD" | "WHATSAPP") => {
    if (!accessoryName.trim()) {
      setError("Please enter the accessory or item name");
      return;
    }
    const numPrice = totalPrice;
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Please enter a valid price (e.g. ₹499)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleanMobile = customerMobile.replace(/\D/g, "");
      const targetStoreId = activeStoreId && activeStoreId !== "ALL" ? activeStoreId : undefined;

      const req: CreateAccessorySaleRequest = {
        accessoryName: accessoryName.trim(),
        price: numPrice,
        quantity,
        unitPrice: parseFloat(unitPrice) || numPrice,
        discount: parseFloat(discount) || 0,
        paymentMode,
        warrantyMonths,
        serialNumber: serialNumber.trim() || undefined,
        customerName: customerName.trim() || "Walk-in Customer",
        customerMobile: cleanMobile.length >= 10 ? cleanMobile.slice(-10) : "0000000000",
        notes: notes.trim() || undefined,
        storeId: targetStoreId,
      };

      const sale = await api<AccessorySale>("/accessory-sales", {
        method: "POST",
        body: JSON.stringify(req),
      });

      // Execute primary initial action
      if (action === "PRINT") {
        printAccessoryWarrantyBill(sale.id, sale.billNumber).catch((e) => console.warn(e));
      } else if (action === "DOWNLOAD") {
        downloadAccessoryWarrantyBill(sale.id, sale.billNumber).catch((e) => console.warn(e));
      } else if (action === "WHATSAPP") {
        sendWhatsApp(sale);
      }

      if (onSuccess) {
        onSuccess(sale);
      }

      // Switch modal to post-sale success confirmation view
      setCompletedSale(sale);
    } catch (err: any) {
      setError(err?.message || "Failed to complete accessory sale");
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsApp = (sale: AccessorySale) => {
    const cleanMobile = sale.customerMobile.replace(/\D/g, "");
    if (cleanMobile.length < 10 || cleanMobile.startsWith("0000")) {
      alert("No valid customer phone number to send WhatsApp");
      return;
    }
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const isWarranty = sale.warrantyMonths > 0;
    const header = isWarranty
      ? "*Famous Mobiles - Official Warranty Bill*"
      : "*Famous Mobiles - Sale Receipt*";

    let warrantyLine = "";
    if (isWarranty) {
      let formattedExpiry = "";
      if (sale.warrantyExpiresAt) {
        const d = new Date(sale.warrantyExpiresAt + "T00:00:00");
        formattedExpiry = !isNaN(d.getTime())
          ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : sale.warrantyExpiresAt;
      }
      warrantyLine = `\n*Warranty:* ${sale.warrantyMonths} Months (Valid till ${formattedExpiry})`;
    }

    const serialLine = sale.serialNumber ? `\n*Serial/IMEI:* ${sale.serialNumber}` : "";
    const qtyLine = sale.quantity && sale.quantity > 1 ? ` (Qty: ${sale.quantity})` : "";
    const storeAddress = currentStore?.addressLine1
      ? `${currentStore.addressLine1}${currentStore.addressLine2 ? `, ${currentStore.addressLine2}` : ""}`
      : "Opp Friends Colony Bus Stop, Shaikpet Main Road, Manikonda, Hyderabad.";
    const storePhone = currentStore?.mobile || "9063786751";

    const msg = `${header}\n\nHello ${sale.customerName},\nThank you for purchasing at *Famous Mobiles*!\n\n📋 *Bill No:* ${sale.billNumber}\n*Item:* ${sale.accessoryName}${qtyLine}\n*Amount Paid:* ${formatCurrency(sale.price)} (${sale.paymentMode})${warrantyLine}${serialLine}\n\n📍 *${currentStore?.name || "Famous Mobiles"}*\n${storeAddress}\n📞 Store Contact: +91 ${storePhone}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-[14px] bg-white border border-[#EBEBEB] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* VIEW 1: POST-SALE SUCCESS & BILL ACTIONS SCREEN                */}
        {/* ============================================================== */}
        {completedSale ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Success Header */}
            <div className="bg-[#0E8345] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Sale Completed & Bill Issued</h3>
                  <p className="text-xs text-white/90 font-mono mt-0.5">
                    Invoice #{completedSale.billNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div className="rounded-[12px] border border-[#EBEBEB] bg-[#FDFDFD] p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-2">
                  <span className="text-[#767676] font-medium">Item & Quantity</span>
                  <span className="font-bold text-[#121212] text-right">
                    {completedSale.accessoryName} {completedSale.quantity && completedSale.quantity > 1 ? `× ${completedSale.quantity}` : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-2">
                  <span className="text-[#767676] font-medium">Total Paid</span>
                  <div className="text-right">
                    <span className="text-base font-bold text-[#0E8345]">
                      {formatCurrency(completedSale.price)}
                    </span>
                    <span className="ml-1.5 text-[11px] font-semibold text-[#767676] uppercase">
                      ({completedSale.paymentMode})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-2">
                  <span className="text-[#767676] font-medium">Customer</span>
                  <span className="font-semibold text-[#121212]">
                    {completedSale.customerName} ({completedSale.customerMobile})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#767676] font-medium">Warranty Coverage</span>
                  {completedSale.warrantyMonths > 0 ? (
                    <span className="font-bold text-[#0E8345] bg-[#E6F4EA] px-2 py-0.5 rounded-[6px] border border-[#B8E3C8]">
                      🛡️ {completedSale.warrantyMonths} Months Replacement
                    </span>
                  ) : (
                    <span className="font-medium text-[#767676]">Standard (No Warranty)</span>
                  )}
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div>
                <p className="text-[11px] font-bold text-[#767676] uppercase tracking-wider mb-2">
                  Bill & Printing Options
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Print Bill */}
                  <button
                    type="button"
                    disabled={postSaleActionLoading !== null}
                    onClick={async () => {
                      setPostSaleActionLoading("print");
                      try {
                        await printAccessoryWarrantyBill(completedSale.id, completedSale.billNumber);
                      } finally {
                        setPostSaleActionLoading(null);
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-[8px] bg-[#121212] text-white py-2.5 px-3 text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    {postSaleActionLoading === "print" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4 text-[#0E8345]" />
                    )}
                    <span>Print Bill</span>
                  </button>

                  {/* Send WhatsApp */}
                  <button
                    type="button"
                    onClick={() => sendWhatsApp(completedSale)}
                    className="flex items-center justify-center gap-2 rounded-[8px] border border-[#25D366]/40 bg-[#25D366]/10 text-[#075E54] py-2.5 px-3 text-xs font-bold hover:bg-[#25D366]/20 transition-all cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    <span>WhatsApp Bill</span>
                  </button>

                  {/* Download PDF */}
                  <button
                    type="button"
                    disabled={postSaleActionLoading !== null}
                    onClick={async () => {
                      setPostSaleActionLoading("download");
                      try {
                        await downloadAccessoryWarrantyBill(completedSale.id, completedSale.billNumber);
                      } finally {
                        setPostSaleActionLoading(null);
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-[8px] border border-[#EBEBEB] bg-[#F7F7F8] text-[#121212] py-2.5 px-3 text-xs font-semibold hover:bg-[#EBEBEB] transition-all cursor-pointer"
                  >
                    {postSaleActionLoading === "download" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 text-[#767676]" />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Post-Sale Footer */}
            <div className="flex items-center justify-between border-t border-[#EBEBEB] bg-[#FDFDFD] px-4 py-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1.5 rounded-[8px] bg-[#121212] text-white px-4 py-2 text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>+ Next Sale</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] border border-[#EBEBEB] bg-white px-4 py-2 text-xs font-semibold text-[#121212] hover:bg-[#F7F7F8] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* VIEW 2: ACCESSORY INTAKE & BILL CREATION FORM                 */
          /* ============================================================== */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EBEBEB] px-4 py-3 bg-[#FDFDFD]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#121212] text-white">
                  <ShieldCheck className="h-5 w-5 text-[#0E8345]" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-[#121212] leading-tight">
                    Sell Accessory & Issue Warranty Bill
                  </h2>
                  <p className="text-[11px] text-[#767676]">
                    Instant counter sale with official store warranty invoice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-[6px] p-1.5 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mandate Pre-fills Badge Strip */}
            <div className="grid grid-cols-3 gap-2 border-b border-[#EBEBEB] bg-[#F7F7F8] px-4 py-2 text-[10.5px] text-[#767676]">
              <div className="flex items-center gap-1 truncate">
                <Store className="h-3 w-3 shrink-0 text-[#121212]" />
                <span className="font-semibold text-[#121212] truncate">
                  {currentStore?.name || "Famous Mobiles"}
                </span>
              </div>
              <div className="flex items-center gap-1 justify-center truncate">
                <Phone className="h-3 w-3 shrink-0 text-[#121212]" />
                <span className="font-mono text-[#121212]">{currentStore?.mobile || "9063786751"}</span>
              </div>
              <div className="flex items-center gap-1 justify-end truncate">
                <Calendar className="h-3 w-3 shrink-0 text-[#121212]" />
                <span className="font-medium text-[#121212]">{todayFormatted}</span>
              </div>
            </div>

            {/* Modal Form Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              {error && (
                <div className="rounded-[8px] bg-[#FDE8E8] border border-[#F8B4B4] p-3 text-[12px] text-[#C5221F] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Accessory Name */}
              <div>
                <label className="block text-[11px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                  Accessory / Item Name <span className="text-[#C5221F]">*</span>
                </label>
                <input
                  type="text"
                  value={accessoryName}
                  onChange={(e) => setAccessoryName(e.target.value)}
                  placeholder="e.g. Boat Airdopes 141, Samsung 25W Type-C Adapter, UV Curved Glass"
                  className="w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 py-2 text-xs text-[#121212] placeholder-[#A0A0A0] focus:border-[#121212] focus:outline-none"
                />
                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {POPULAR_ACCESSORIES.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handlePickPopular(item)}
                      className="rounded-full bg-[#F7F7F8] border border-[#EBEBEB] px-2 py-0.5 text-[10.5px] text-[#767676] hover:bg-[#EBEBEB] hover:text-[#121212] transition-colors cursor-pointer"
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing, Quantity & Discount Row */}
              <div className="rounded-[10px] border border-[#EBEBEB] bg-[#FDFDFD] p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Unit Price */}
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                      Unit Price (₹) <span className="text-[#C5221F]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#767676] font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="499"
                        className="w-full rounded-[8px] border border-[#EBEBEB] bg-white pl-6 pr-2 py-1.5 text-xs font-bold text-[#121212] focus:border-[#121212] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                      Quantity
                    </label>
                    <div className="flex items-center border border-[#EBEBEB] rounded-[8px] bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-2.5 py-1.5 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center py-1.5 text-xs font-bold text-[#121212] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="px-2.5 py-1.5 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                      Discount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#767676] font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-[8px] border border-[#EBEBEB] bg-white pl-6 pr-2 py-1.5 text-xs font-medium text-[#121212] focus:border-[#121212] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Net Total & Payment Mode */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#EBEBEB]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#767676]">Net Amount:</span>
                    <span className="text-base font-bold text-[#0E8345]">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="flex items-center gap-1">
                    {(["UPI", "CASH", "CARD"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={cn(
                          "rounded-[6px] px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer border text-center",
                          paymentMode === mode
                            ? "bg-[#121212] text-white border-[#121212] shadow-2xs"
                            : "bg-white text-[#767676] border-[#EBEBEB] hover:bg-[#F7F7F8]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warranty Duration in Months */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#121212] uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#0E8345]" />
                    <span>Warranty Duration</span>
                  </label>
                  {warrantyMonths > 0 ? (
                    <span className="text-[11px] font-bold text-[#0E8345]">
                      Valid till {warrantyExpiryDate} ({warrantyMonths}M)
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#767676]">
                      Standard counter sale (No warranty)
                    </span>
                  )}
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {WARRANTY_MONTH_PRESETS.map((preset) => (
                    <button
                      key={preset.months}
                      type="button"
                      onClick={() => handleSelectPreset(preset.months)}
                      className={cn(
                        "rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer border",
                        warrantyMonths === preset.months && customMonths === ""
                          ? "bg-[#121212] text-white border-[#121212] font-semibold shadow-2xs"
                          : "bg-[#F7F7F8] text-[#121212] border-[#EBEBEB] hover:bg-[#EBEBEB]"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom months input */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10.5px] text-[#767676]">Or custom months:</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={customMonths}
                    onChange={(e) => handleCustomMonthsChange(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-16 rounded-[6px] border border-[#EBEBEB] bg-white px-2 py-0.5 text-xs text-[#121212] focus:border-[#121212] focus:outline-none"
                  />
                  <span className="text-[10.5px] text-[#767676]">months</span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                    Customer Mobile <span className="text-[#767676] font-normal">(Optional for walk-in)</span>
                  </label>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(cleanMobileInput(e.target.value))}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    className="w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 py-2 text-xs text-[#121212] placeholder-[#A0A0A0] focus:border-[#121212] focus:outline-none"
                  />
                  {matchedCustomer && (
                    <p className="text-[10px] text-[#0E8345] font-medium mt-0.5">
                      ✓ Found: {matchedCustomer.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 py-2 text-xs text-[#121212] placeholder-[#A0A0A0] focus:border-[#121212] focus:outline-none"
                  />
                </div>
              </div>

              {/* Serial / IMEI & Box Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                    Serial / IMEI / Batch # (Optional)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-BT-102938, IMEI, batch"
                    className="w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 py-2 text-xs text-[#121212] placeholder-[#A0A0A0] focus:border-[#121212] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#121212] uppercase tracking-wide mb-1">
                    Remarks / Box Condition
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Box seal verified, original cable inside"
                    className="w-full rounded-[8px] border border-[#EBEBEB] bg-white px-3 py-2 text-xs text-[#121212] placeholder-[#A0A0A0] focus:border-[#121212] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[#EBEBEB] bg-[#FDFDFD] px-4 py-3">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="w-full sm:w-auto rounded-[8px] border border-[#EBEBEB] bg-white px-3.5 py-2 text-xs font-semibold text-[#121212] hover:bg-[#F7F7F8] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* WhatsApp Share */}
                {customerMobile.length >= 10 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCompleteSale("WHATSAPP")}
                    className="flex items-center gap-1 rounded-[8px] border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-2 text-xs font-semibold text-[#075E54] hover:bg-[#25D366]/20 transition-all cursor-pointer disabled:opacity-50"
                    title="Complete & Send WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </button>
                )}

                {/* Complete & Print Bill (Primary) */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCompleteSale("PRINT")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-[8px] bg-[#121212] hover:bg-black px-4 py-2 text-xs font-bold text-white shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Issuing Bill...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-3.5 w-3.5 text-[#0E8345]" />
                      <span>Complete & Print Bill</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
