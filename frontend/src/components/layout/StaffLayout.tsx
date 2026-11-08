"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  BarChart3,
  Search,
  LogOut,
  Smartphone,
  UserCog,
  Plus,
  ShoppingBag,
  RotateCw,
} from "lucide-react";
import { logoutUser } from "@/lib/api";
import { cn, formatRole } from "@/lib/utils";
import { IntakeForkModal } from "@/components/stock/IntakeForkModal";
import { StockOrderModal } from "@/components/stock/StockOrderModal";
import { StoreSwitcher } from "@/components/layout/StoreSwitcher";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tickets", label: "Repairs", icon: Wrench },
  { href: "/stock-orders", label: "Stock Demand", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/search", label: "Search", icon: Search },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/staff", label: "Staff", icon: UserCog, adminOnly: true },
];

export function StaffLayout({ children, userName, role }: { children: React.ReactNode; userName?: string; role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isForkOpen, setIsForkOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Android hardware back button handler: close modal if open
  useAndroidBackButton(() => setIsStockModalOpen(false), isStockModalOpen, 20);
  useAndroidBackButton(() => setIsForkOpen(false), isForkOpen, 15);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trigger global data refresh with visual feedback
  const triggerRefresh = useCallback(() => {
    if (isRefreshing) {
      window.location.reload();
      return;
    }
    setIsRefreshing(true);
    if (typeof window !== "undefined") {
      try {
        if ("vibrate" in navigator) navigator.vibrate(20);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("fm:refresh"));
    }
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  }, [isRefreshing, router]);

  // Auto-refresh when app resumes from background / screen unlock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.dispatchEvent(new CustomEvent("fm:refresh"));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, []);

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && role !== "ADMIN") return false;
    return true;
  });

  const logout = async () => {
    await logoutUser();
  };

  const isTicketDetail = /^\/tickets\/[a-zA-Z0-9_-]+$/.test(pathname);
  const showFab = pathname !== "/tickets/new" && !isTicketDetail;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-2xs pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={triggerRefresh}
              title="Tap to sync & refresh data (Double-tap for hard reload)"
              aria-label="Refresh data"
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl gradient-header text-white shadow-md touch-active active:scale-95 transition-transform cursor-pointer"
            >
              <Smartphone className={cn("h-4 w-4 transition-transform duration-500", isRefreshing && "rotate-180 scale-90")} />
              {/* Subtle mini sync badge on icon corner */}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue-600 shadow-2xs ring-1 ring-slate-200">
                <RotateCw className={cn("h-2.5 w-2.5 transition-transform duration-500", isRefreshing && "animate-spin text-blue-600")} />
              </span>
            </button>
            <Link href="/dashboard" className="hidden sm:inline font-bold text-slate-900 transition-opacity hover:opacity-80">
              Famous Mobiles
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <StoreSwitcher role={role} />
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:inline">
              {userName} · {formatRole(role ?? "")}
            </span>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="touch-target rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {isRefreshing && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900/90 text-white px-3.5 py-1 text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 pointer-events-none">
          <RotateCw className="h-3 w-3 animate-spin text-blue-400" />
          Syncing latest updates...
        </div>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {visibleNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  pathname.startsWith(href)
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-white hover:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Material 3 Mobile bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex justify-around items-center px-1 py-1">
          {visibleNavItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 touch-target min-w-[58px] touch-active"
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full px-3.5 py-1 transition-all duration-200",
                    isActive
                      ? "bg-blue-100 text-blue-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
                </div>
                <span
                  className={cn(
                    "text-[10.5px] tracking-tight transition-colors",
                    isActive ? "font-bold text-blue-800" : "font-medium text-slate-500"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Elevated FAB — Intake Fork Modal (Repair vs Order Stock) */}
      {showFab && (
        <button
          type="button"
          onClick={() => setIsForkOpen(true)}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-xl shadow-blue-600/30 touch-active hover:shadow-2xl md:bottom-6 md:right-6"
          aria-label="New Intake"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {/* Intake Fork: Choose Repair vs Order Stock */}
      <IntakeForkModal
        isOpen={isForkOpen}
        onClose={() => setIsForkOpen(false)}
        onSelectStockOrder={() => setIsStockModalOpen(true)}
      />

      {/* Order Stock Modal */}
      <StockOrderModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={() => {
          if (pathname === "/dashboard") {
            window.location.reload();
          } else {
            router.push("/dashboard");
          }
        }}
      />
    </div>
  );
}
