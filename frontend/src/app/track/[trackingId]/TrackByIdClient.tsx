"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Smartphone, Phone, MessageSquare, ArrowLeft, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { SHOP } from "@/lib/shop";
import { ShopTerms } from "@/components/ShopInfo";

export default function TrackByIdClient() {
  const params = useParams<{ trackingId: string }>();
  const searchParams = useSearchParams();
  const rawId = params?.trackingId || searchParams.get("trackingId") || searchParams.get("id");
  const trackingId = rawId && rawId !== "view" ? rawId : searchParams.get("trackingId") || searchParams.get("id") || "";

  const shopPhone = SHOP.mobile || "9063786751";
  const cleanPhone = shopPhone.replace(/\D/g, "");
  const internationalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const whatsappMessage = trackingId
    ? `Hello Famous Mobiles, I would like to check the repair status for Ticket ID: ${trackingId}.`
    : `Hello Famous Mobiles, I would like to check the status of my device repair.`;

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <header className="sticky top-0 z-10 border-b border-[#EBEBEB] bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#121212] text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] text-[#767676]">Device Repair Status</p>
            <p className="font-bold text-[15px] text-[#121212]">Famous Mobiles</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4 pb-8 space-y-4">
        <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-semibold text-[#121212]">
            <span>Notice: Online Tracking Retired</span>
          </div>

          {trackingId && (
            <div className="mt-3 rounded-[10px] bg-[#F7F7F8] p-3 text-xs text-[#767676] font-mono">
              Ticket Reference: <span className="font-bold text-[#121212]">{trackingId}</span>
            </div>
          )}

          <h2 className="mt-3 text-[18px] font-bold text-[#121212] leading-snug">
            Need an update on your device repair?
          </h2>

          <p className="mt-2 text-sm text-[#767676] leading-relaxed">
            To safeguard customer privacy and protect service records, public online tracking has been replaced by direct technician updates. Please contact our shop team directly.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <a
              href={`tel:+${internationalPhone}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#121212] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black transition-colors"
            >
              <Phone className="h-4 w-4" />
              Call Shop: +91 {cleanPhone.slice(-10)}
            </a>
            <a
              href={`https://wa.me/${internationalPhone}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#25D366] bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-[#25D366]" />
              WhatsApp Us
            </a>
          </div>

          <div className="mt-6 space-y-3 border-t border-[#EBEBEB] pt-4 text-xs text-[#767676]">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-[#121212] mt-0.5" />
              <div>
                <p className="font-semibold text-[#121212]">Business Hours</p>
                <p>Mon - Sat: 10:00 AM – 10:00 PM | Sun: 11:00 AM – 8:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#121212] mt-0.5" />
              <div>
                <p className="font-semibold text-[#121212]">Store Location</p>
                <p>{SHOP.addressLines.join(", ")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#767676] hover:text-[#121212]"
          >
            <ArrowLeft className="h-3 w-3" />
            Staff Portal Login
          </Link>
        </div>

        <ShopTerms className="mt-4" />
      </main>
    </div>
  );
}
