"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ShoppingBag, ClipboardPaste, Check, Sparkles, Phone, User, Tag, IndianRupee, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { Customer, StockOrder } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { cleanMobileInput, isExact10DigitMobile, findExactCustomerMatch } from "@/lib/new-ticket-validation";

interface StockOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: StockOrder) => void;
}

const COMMON_ACCESSORIES = [
  "Watch Charger",
  "15 Pro Max Case",
  "S25 Edge Fancy Case",
  "Matte Glass",
  "Lens Protector",
  "Type-C Cable",
  "Fast Adapter",
  "AirPods Case",
];

const ADVANCE_PRESETS = [0, 100, 200, 500];

export function StockOrderModal({ isOpen, onClose, onSuccess }: StockOrderModalProps) {
  const [mobile, setMobile] = useState("");
  const debouncedMobile = useDebounce(mobile, 300);
  const [customerName, setCustomerName] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [itemDetails, setItemDetails] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [advanceAmount, setAdvanceAmount] = useState<number | string>(0);
  const [expectedPrice, setExpectedPrice] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [whatsappPasteInput, setWhatsappPasteInput] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setMobile("");
      setCustomerName("");
      setMatchedCustomer(null);
      setItemDetails("");
      setQuantity(1);
      setAdvanceAmount(0);
      setExpectedPrice("");
      setNotes("");
      setError("");
      setShowPasteBox(false);
      setWhatsappPasteInput("");
    }
  }, [isOpen]);

  // Lookup customer when 10 digits are typed
  useEffect(() => {
    const clean = mobile.replace(/\s+/g, "");
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

  // WhatsApp line parser
  const handleParseWhatsApp = (text: string) => {
    if (!text.trim()) return;
    // Regex matches patterns like:
    // [7:44 pm, 25/10/2026] Navaneeth@dkn: 15pro max black colour case
    // or Navaneeth: S25edge fancy case...
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^\[.*?\]\s*[^:]+:\s*/i, ""); // strip timestamp & author
    cleaned = cleaned.replace(/^[^:]+:\s*/i, ""); // strip plain "Author:"

    setItemDetails((prev) => (prev ? `${prev}, ${cleaned}` : cleaned));
    setWhatsappPasteInput("");
    setShowPasteBox(false);
  };

  const handleAddChip = (chip: string) => {
    setItemDetails((prev) => {
      if (!prev) return chip;
      if (prev.toLowerCase().includes(chip.toLowerCase())) return prev;
      return `${prev}, ${chip}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanMobile = mobile.replace(/\s+/g, "");
    if (cleanMobile && !isExact10DigitMobile(cleanMobile)) {
      setError("Please enter a valid 10-digit mobile number, or leave empty for shop stock.");
      return;
    }

    if (!itemDetails.trim()) {
      setError("Please enter the item / accessory details.");
      return;
    }

    setLoading(true);
    try {
      const advNum = Number(advanceAmount) || 0;
      const expNum = expectedPrice ? Number(expectedPrice) : undefined;

      const fallbackName = cleanMobile ? `Customer ${cleanMobile}` : "Shop Stock";
      const payload = {
        customerId: matchedCustomer?.id,
        customerName: customerName.trim() || fallbackName,
        customerMobile: cleanMobile || undefined,
        itemDetails: itemDetails.trim(),
        quantity: quantity > 0 ? quantity : 1,
        advanceAmount: advNum,
        expectedPrice: expNum,
        notes: notes.trim() || undefined,
      };

      const res = await api<StockOrder>("/stock-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create stock order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Order Stock / Accessories</h3>
              <p className="text-xs text-slate-500">Customer special demand & accessory request</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* WhatsApp Quick Paste Toggle */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-900">Got text from WhatsApp group?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                {showPasteBox ? "Hide Paste Box" : "Quick Paste"}
              </button>
            </div>

            {showPasteBox && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={whatsappPasteInput}
                  onChange={(e) => setWhatsappPasteInput(e.target.value)}
                  placeholder="Paste e.g. [7:44 pm] Navaneeth: 15pro max black colour case"
                  className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleParseWhatsApp(whatsappPasteInput)}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Insert
                </button>
              </div>
            )}
          </div>

          {/* Customer Mobile & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-500" /> Customer Mobile
                </label>
                <span className="text-[11px] font-normal text-slate-400">Optional (for shop)</span>
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(cleanMobileInput(e.target.value))}
                placeholder="10-digit mobile (or leave empty)"
                maxLength={10}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {matchedCustomer && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <Check className="h-3 w-3" /> Existing: {matchedCustomer.fullName}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" /> Customer / Recipient
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName("Shop Stock");
                    setMobile("");
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  Set as &quot;Shop Stock&quot;
                </button>
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Shop Stock or Customer Name"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Item Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-500" /> Accessory / Item Details *
            </label>
            <textarea
              value={itemDetails}
              onChange={(e) => setItemDetails(e.target.value)}
              placeholder="e.g. S25 Edge fancy case, lens protector, matte glass or Watch charger"
              rows={2}
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />

            {/* Quick chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COMMON_ACCESSORIES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAddChip(chip)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Advance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Quantity</label>
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5 text-slate-500" /> Advance Paid (₹)
              </label>
              <div className="flex gap-1.5 mb-1.5">
                {ADVANCE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAdvanceAmount(p)}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold border transition-all ${
                      Number(advanceAmount) === p
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p === 0 ? "₹0" : `₹${p}`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="Custom advance"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Expected Price & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quoted / Estimated Price (₹) <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min={0}
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(e.target.value)}
                placeholder="e.g. 450"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Notes / Urgency <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Needs before Friday evening"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {loading ? "Saving Order..." : "Save & Track Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
