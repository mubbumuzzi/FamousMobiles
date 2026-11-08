"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";

type BackButtonHandler = () => boolean | void;

// Global stack of back button handlers (LIFO: topmost modal/handler consumes the press first)
const handlerStack: { id: string; priority: number; handler: BackButtonHandler }[] = [];
let isListenerAttached = false;

function initGlobalBackListener(routerBack: () => void) {
  if (isListenerAttached) return;
  isListenerAttached = true;

  if (Capacitor.isNativePlatform()) {
    App.addListener("backButton", ({ canGoBack }) => {
      // Sort by priority descending
      const sorted = [...handlerStack].sort((a, b) => b.priority - a.priority);

      for (const item of sorted) {
        const handled = item.handler();
        // If handler returns false explicitly, continue to next. Otherwise consider it consumed.
        if (handled !== false) {
          return;
        }
      }

      // If no handler consumed the event:
      if (canGoBack && typeof window !== "undefined" && window.history.length > 1) {
        routerBack();
      } else {
        App.exitApp();
      }
    });
  }
}

/**
 * Hook to register an Android hardware back button handler.
 * @param onBack Callback function. Return false if you want other handlers to run, otherwise returning void/true consumes the event.
 * @param isActive Whether this handler is currently active (e.g. isOpen === true).
 * @param priority Higher priority runs first (default: 10 for modals, 20 for nested dialogs).
 */
export function useAndroidBackButton(
  onBack: BackButtonHandler,
  isActive: boolean = true,
  priority: number = 10
) {
  const router = useRouter();
  const idRef = useRef<string>(Math.random().toString(36).substring(2, 9));
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    initGlobalBackListener(() => router.back());
  }, [router]);

  useEffect(() => {
    if (!isActive) return;

    const id = idRef.current;
    handlerStack.push({
      id,
      priority,
      handler: () => onBackRef.current(),
    });

    return () => {
      const idx = handlerStack.findIndex((item) => item.id === id);
      if (idx !== -1) {
        handlerStack.splice(idx, 1);
      }
    };
  }, [isActive, priority]);
}
