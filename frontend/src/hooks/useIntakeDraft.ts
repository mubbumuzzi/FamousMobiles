"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Customer, DeviceType } from "@/lib/types";

export interface IntakeDraftState {
  step: number;
  selectedStoreId: string;
  customerId: string;
  selectedCustomer: Customer | null;
  newCustomer: {
    fullName: string;
    mobile: string;
    alternateMobile: string;
    address: string;
    city: string;
  };
  mobile: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  color: string;
  imei: string;
  accessories: string[];
  conditions: string[];
  problem: string;
  selectedTemplates: string[];
  estimatedCost: string;
  quoteAfterDiagnosis: boolean;
  advancePaid: string;
  edd: string;
  warrantyDays: number;
}

const STORAGE_KEY = "fm_draft_new_ticket";

export const initialDraftState: IntakeDraftState = {
  step: 0,
  selectedStoreId: "",
  customerId: "",
  selectedCustomer: null,
  newCustomer: { fullName: "", mobile: "", alternateMobile: "", address: "", city: "" },
  mobile: "",
  deviceType: "MOBILE",
  brand: "",
  model: "",
  color: "",
  imei: "",
  accessories: [],
  conditions: [],
  problem: "",
  selectedTemplates: [],
  estimatedCost: "",
  quoteAfterDiagnosis: false,
  advancePaid: "",
  edd: "",
  warrantyDays: 0,
};

export function useIntakeDraft() {
  const [draft, setDraftState] = useState<IntakeDraftState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...initialDraftState, ...parsed };
        }
      } catch (_) {}
    }
    return initialDraftState;
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback((nextDraft: IntakeDraftState) => {
    setDraftState(nextDraft);
    if (typeof window === "undefined") return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
      } catch (_) {}
    }, 150);
  }, []);

  const clearDraft = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setDraftState(initialDraftState);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
    }
  }, []);

  const updateDraft = useCallback(
    <K extends keyof IntakeDraftState>(key: K, value: IntakeDraftState[K]) => {
      setDraftState((prev) => {
        const next = { ...prev, [key]: value };
        saveDraft(next);
        return next;
      });
    },
    [saveDraft]
  );

  const hasDraft =
    draft.step > 0 ||
    Boolean(draft.mobile) ||
    Boolean(draft.brand) ||
    Boolean(draft.problem) ||
    Boolean(draft.newCustomer.fullName);

  return {
    draft,
    saveDraft,
    updateDraft,
    clearDraft,
    hasDraft,
  };
}
