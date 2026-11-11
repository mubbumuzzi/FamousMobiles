"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const scrollCache = new Map<string, number>();

/**
 * Tracks and restores window scroll position per route in Next.js App Router.
 * Ensures that going back to a previously scrolled list (Tickets, Dashboard, Customers)
 * returns the user to their exact scroll position.
 */
export function useScrollRestoration() {
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);
  const isRestoringRef = useRef(false);

  // Read saved scroll from storage on boot
  const getSavedScroll = (path: string): number => {
    if (scrollCache.has(path)) {
      return scrollCache.get(path) || 0;
    }
    if (typeof window !== "undefined") {
      try {
        const val = sessionStorage.getItem(`fm_scroll_${path}`);
        if (val !== null) {
          const num = parseInt(val, 10);
          if (!isNaN(num)) return num;
        }
      } catch (_) {}
    }
    return 0;
  };

  const saveScroll = (path: string, y: number) => {
    scrollCache.set(path, y);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`fm_scroll_${path}`, String(Math.round(y)));
      } catch (_) {}
    }
  };

  // Track scroll position on current pathname
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (isRestoringRef.current) return;
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const currentPath = currentPathRef.current;
        const currentY = window.scrollY || document.documentElement.scrollTop || 0;
        saveScroll(currentPath, currentY);
      }, 80);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Restore scroll when pathname changes
  useEffect(() => {
    currentPathRef.current = pathname;
    if (typeof window === "undefined") return;

    const savedY = getSavedScroll(pathname);
    if (savedY > 0) {
      isRestoringRef.current = true;

      // Attempt immediate restoration, followed by delayed retry if DOM expands asynchronously
      const attemptRestore = () => {
        window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior });
      };

      // 1. Next animation frame
      const frame1 = requestAnimationFrame(attemptRestore);

      // 2. Short timeout to handle async data hydration
      const timer1 = setTimeout(attemptRestore, 60);
      const timer2 = setTimeout(() => {
        attemptRestore();
        isRestoringRef.current = false;
      }, 180);

      return () => {
        cancelAnimationFrame(frame1);
        clearTimeout(timer1);
        clearTimeout(timer2);
        isRestoringRef.current = false;
      };
    } else {
      isRestoringRef.current = false;
    }
  }, [pathname]);
}
