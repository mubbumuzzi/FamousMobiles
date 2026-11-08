"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Store } from "@/lib/types";
import { api } from "@/lib/api";

const STORAGE_KEY = "fm_active_store_id";

interface StoreContextType {
  stores: Store[];
  activeStore: Store | null;
  activeStoreId: string | "ALL";
  setActiveStoreId: (id: string | "ALL") => void;
  isLoading: boolean;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  stores: [],
  activeStore: null,
  activeStoreId: "ALL",
  setActiveStoreId: () => {},
  isLoading: true,
  refreshStores: async () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string | "ALL">(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "ALL";
    }
    return "ALL";
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    try {
      const data = await api<Store[]>("/stores");
      const activeStores = data.filter((s) => s.active !== false);
      setStores(activeStores);

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== "ALL") {
          const exists = activeStores.some((s) => s.id === stored);
          if (!exists && activeStores.length > 0) {
            setActiveStoreIdState(activeStores[0].id);
            localStorage.setItem(STORAGE_KEY, activeStores[0].id);
          }
        } else if (!stored && activeStores.length > 0) {
          // Default to first branch if never chosen
          setActiveStoreIdState(activeStores[0].id);
          localStorage.setItem(STORAGE_KEY, activeStores[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch stores", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const setActiveStoreId = useCallback((id: string | "ALL") => {
    setActiveStoreIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const activeStore = useMemo(() => {
    if (activeStoreId === "ALL") return null;
    return stores.find((s) => s.id === activeStoreId) || null;
  }, [stores, activeStoreId]);

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        activeStoreId,
        setActiveStoreId,
        isLoading,
        refreshStores: fetchStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
