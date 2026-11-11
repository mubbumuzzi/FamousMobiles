"use client";

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";

// In-memory fallback if sessionStorage is blocked, full, or during SSR
const memoryStorage = new Map<string, unknown>();

/**
 * Persists UI state (search query, active filter, view mode, tabs)
 * in sessionStorage so that navigating away and coming back preserves the state.
 */
export function useNavigationState<T>(
  key: string,
  initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const storageKey = `fm_nav_${key}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved !== null) {
          return JSON.parse(saved);
        }
      } catch {
        if (memoryStorage.has(key)) {
          return memoryStorage.get(key) as T;
        }
      }
    }
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  // Sync to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (state === undefined) {
        sessionStorage.removeItem(storageKey);
        memoryStorage.delete(key);
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify(state));
        memoryStorage.set(key, state);
      }
    } catch {
      memoryStorage.set(key, state);
    }
  }, [key, storageKey, state]);

  // Reset to initial value and remove from storage
  const reset = useCallback(() => {
    const defaultVal =
      typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
    setState(defaultVal);
    try {
      sessionStorage.removeItem(storageKey);
      memoryStorage.delete(key);
    } catch {
      memoryStorage.delete(key);
    }
  }, [key, storageKey, initialValue]);

  return [state, setState, reset];
}

/**
 * Clears all navigation and draft storage (e.g. on user logout).
 */
export function clearAllNavigationState(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith("fm_nav_") || k.startsWith("fm_draft_") || k.startsWith("fm_scroll_"))) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      sessionStorage.removeItem(k);
    }
    memoryStorage.clear();
  } catch {
    memoryStorage.clear();
  }
}
