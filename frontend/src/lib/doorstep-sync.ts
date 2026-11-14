"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface DoorstepBookingSummary {
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
  visitCharge: number;
  firstVisitFree: boolean;
  createdAt: string;
}

export function playDoorstepChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First bell tone (880Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second bell tone (659Hz / E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659, now + 0.16);
    gain2.gain.setValueAtTime(0.18, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.debug("AudioContext chime suppressed by browser policy:", err);
  }
}

export function getCustFmApiUrl(): string {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalhost) {
      return "http://localhost:8081/api";
    }
    return "http://13.140.146.12:8080/api";
  }
  return "http://127.0.0.1:8081/api";
}

export function useDoorstepSync(pollIntervalMs = 10000) {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [newCount, setNewCount] = useState<number>(0);
  const [latestBooking, setLatestBooking] = useState<DoorstepBookingSummary | null>(null);
  const isInitialFetch = useRef(true);

  const checkBookings = useCallback(async () => {
    try {
      const res = await fetch(`${getCustFmApiUrl()}/public/bookings`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const bookings: DoorstepBookingSummary[] = await res.json();
      if (!Array.isArray(bookings)) return;

      // Active enquiries: stages 0 through 9 (10 is completed/closed)
      const active = bookings.filter((b) => b.currentStageIndex < 10);
      const newlyReceived = bookings.filter((b) => b.currentStageIndex <= 2);

      setActiveCount(active.length);
      setNewCount(newlyReceived.length);

      if (bookings.length > 0) {
        const top = bookings[0];
        setLatestBooking(top);

        const storedId = localStorage.getItem("fm_last_known_doorstep_id");
        if (storedId && storedId !== top.bookingId && !isInitialFetch.current) {
          // New incoming online booking detected!
          playDoorstepChime();
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("fm:new-doorstep-booking", { detail: top })
            );
          }
        }
        localStorage.setItem("fm_last_known_doorstep_id", top.bookingId);
      }
      isInitialFetch.current = false;
    } catch {
      // Silently retry on next interval if CustFM is temporarily unreachable
    }
  }, []);

  useEffect(() => {
    checkBookings();
    const interval = setInterval(checkBookings, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkBookings, pollIntervalMs]);

  return { activeCount, newCount, latestBooking, refresh: checkBookings };
}
