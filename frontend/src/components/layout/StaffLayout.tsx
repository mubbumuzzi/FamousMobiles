"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  BarChart3,
  Search,
  LogOut,
  UserCog,
  Plus,
  ShoppingBag,
  RotateCw,
  MoreHorizontal,
  ChevronDown,
  User,
  ShieldCheck,
} from "lucide-react";
import { logoutUser } from "@/lib/api";
import { cn, formatRole } from "@/lib/utils";
import { IntakeForkModal } from "@/components/stock/IntakeForkModal";
import { StockOrderModal } from "@/components/stock/StockOrderModal";
import { SellAccessoryModal } from "@/components/stock/SellAccessoryModal";
import { StoreSwitcher } from "@/components/layout/StoreSwitcher";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { clearAllNavigationState } from "@/hooks/useNavigationState";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tickets", label: "Repairs", icon: Wrench },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/stock-orders", label: "Stock Demand", icon: ShoppingBag },
  { href: "/search", label: "Search", icon: Search },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/staff", label: "Staff", icon: UserCog, adminOnly: true },
];

export function StaffLayout({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  useScrollRestoration();
  const [isForkOpen, setIsForkOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSellAccessoryModalOpen, setIsSellAccessoryModalOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Android hardware back button handler: close modal if open
  useAndroidBackButton(() => setIsStockModalOpen(false), isStockModalOpen, 20);
  useAndroidBackButton(() => setIsSellAccessoryModalOpen(false), isSellAccessoryModalOpen, 22);
  useAndroidBackButton(() => setIsForkOpen(false), isForkOpen, 15);
  useAndroidBackButton(() => setIsMoreOpen(false), isMoreOpen, 10);

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

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setIsAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for open sell accessory modal event from anywhere (e.g. dashboard quick actions)
  useEffect(() => {
    const handleOpenSell = () => setIsSellAccessoryModalOpen(true);
    window.addEventListener("fm:open-sell-accessory", handleOpenSell);
    return () => window.removeEventListener("fm:open-sell-accessory", handleOpenSell);
  }, []);

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && role !== "ADMIN") return false;
    return true;
  });

  const logout = async () => {
    clearAllNavigationState();
    await logoutUser();
  };

  const isTicketDetail = /^\/tickets\/[a-zA-Z0-9_-]+$/.test(pathname);
  const showFab = pathname !== "/tickets/new" && pathname !== "/dashboard" && !isTicketDetail;

  const initials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "FM";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F7F8] text-[#121212]">
      {/* Top Bar: 56px on mobile, 64px on desktop */}
      <header className="sticky top-0 z-40 w-full border-b border-[#EBEBEB] bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
          {/* Left Slot: Wordmark on desktop (lg+), Store Switcher on mobile */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden lg:inline text-[19px] font-bold tracking-tight text-[#121212] hover:opacity-90 transition-opacity"
            >
              Famous Mobiles
            </Link>
            <div className="lg:hidden">
              <StoreSwitcher role={role} align="left" />
            </div>
          </div>

          {/* Right Slot: Store Switcher on desktop + Sync button + Avatar Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
              <StoreSwitcher role={role} align="right" />
            </div>

            {/* Sync Button: small icon button with aria-label, no overlapping tooltip */}
            <button
              type="button"
              onClick={triggerRefresh}
              aria-label="Sync data"
              title="Sync latest updates"
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F7F7F8] hover:border-[#DFDFDF] active:scale-95 transition-all cursor-pointer"
            >
              <RotateCw className={cn("h-4 w-4 text-[#121212] transition-transform duration-500", isRefreshing && "animate-spin")} />
            </button>

            {/* Avatar Menu with User Name and Logout inside */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                aria-label="User menu"
                aria-expanded={isAvatarOpen}
                className="flex items-center gap-2 rounded-full p-0.5 sm:px-2.5 sm:py-1 border border-[#EBEBEB] bg-white hover:bg-[#F7F7F8] transition-colors cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F0F2] text-[12px] font-bold text-[#121212]">
                  {initials}
                </div>
                <span className="hidden sm:inline text-[13px] font-medium text-[#121212] max-w-[120px] truncate">
                  {userName || "Staff"}
                </span>
                <ChevronDown className="hidden sm:inline h-3.5 w-3.5 text-[#767676]" />
              </button>

              {isAvatarOpen && (
                <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-[12px] border border-[#EBEBEB] bg-white p-1.5 shadow-xl animate-fade-in">
                  <div className="px-3 py-2 border-b border-[#EBEBEB]">
                    <p className="text-[14px] font-bold text-[#121212] truncate">{userName || "Staff"}</p>
                    <p className="text-[12px] text-[#767676]">{formatRole(role ?? "")}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAvatarOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-[#C5221F] hover:bg-[#FDE8E8] transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sync Banner notification */}
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#121212] text-white px-3.5 py-1 text-[12px] font-medium shadow-lg flex items-center gap-1.5 animate-fade-in pointer-events-none">
          <RotateCw className="h-3 w-3 animate-spin text-white" />
          <span>Syncing latest updates...</span>
        </div>
      )}

      {/* Body Content: Sidebar (Desktop 1280px+) + Main Area */}
      <div className="mx-auto flex w-full max-w-[1280px] flex-1">
        {/* Desktop Sidebar: 240px wide, white, 1px right border */}
        <aside className="hidden w-[240px] shrink-0 border-r border-[#EBEBEB] bg-white lg:block">
          <nav className="sticky top-20 p-4 space-y-1">
            {visibleNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-[12px] px-3.5 text-[14px] transition-all relative",
                    isActive
                      ? "bg-[#F0F0F2] text-[#121212] font-bold before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-r before:bg-[#121212]"
                      : "text-[#666666] font-medium hover:bg-[#F7F7F8] hover:text-[#121212]"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#121212]" : "text-[#767676]")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Page Container: 16px padding on mobile, 24px on desktop */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation: 56px high, safe-area padding (Home, Repairs, Customers, Search, More) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#EBEBEB] bg-white lg:hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex h-14 items-center justify-around px-2">
          {/* 1. Home */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 touch-target",
              pathname === "/dashboard" ? "text-[#121212]" : "text-[#767676]"
            )}
          >
            <LayoutDashboard className={cn("h-5 w-5", pathname === "/dashboard" && "stroke-[2.5]")} />
            <span className={cn("text-[11px] leading-none", pathname === "/dashboard" ? "font-bold" : "font-medium")}>
              Home
            </span>
          </Link>

          {/* 2. Repairs / Tickets */}
          <Link
            href="/tickets"
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 touch-target",
              pathname.startsWith("/tickets") && pathname !== "/tickets/new" ? "text-[#121212]" : "text-[#767676]"
            )}
          >
            <Wrench className={cn("h-5 w-5", pathname.startsWith("/tickets") && pathname !== "/tickets/new" && "stroke-[2.5]")} />
            <span className={cn("text-[11px] leading-none", pathname.startsWith("/tickets") && pathname !== "/tickets/new" ? "font-bold" : "font-medium")}>
              Repairs
            </span>
          </Link>

          {/* 3. Customers */}
          <Link
            href="/customers"
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 touch-target",
              pathname.startsWith("/customers") ? "text-[#121212]" : "text-[#767676]"
            )}
          >
            <Users className={cn("h-5 w-5", pathname.startsWith("/customers") && "stroke-[2.5]")} />
            <span className={cn("text-[11px] leading-none", pathname.startsWith("/customers") ? "font-bold" : "font-medium")}>
              Customers
            </span>
          </Link>

          {/* 4. Search */}
          <Link
            href="/search"
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 touch-target",
              pathname.startsWith("/search") ? "text-[#121212]" : "text-[#767676]"
            )}
          >
            <Search className={cn("h-5 w-5", pathname.startsWith("/search") && "stroke-[2.5]")} />
            <span className={cn("text-[11px] leading-none", pathname.startsWith("/search") ? "font-bold" : "font-medium")}>
              Search
            </span>
          </Link>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 touch-target cursor-pointer",
              pathname.startsWith("/stock-orders") || pathname.startsWith("/reports") || pathname.startsWith("/staff")
                ? "text-[#121212]"
                : "text-[#767676]"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[11px] leading-none font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* "More" Bottom Sheet for Mobile */}
      <BottomSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="More Tools"
        description="Access additional shop operations"
      >
        <div className="space-y-1.5 py-1">
          <Link
            href="/stock-orders"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 rounded-[10px] p-3 text-[14px] font-medium text-[#121212] hover:bg-[#F7F7F8] transition-colors"
          >
            <ShoppingBag className="h-5 w-5 text-[#767676]" />
            <div>
              <p className="font-semibold text-[#121212]">Stock Demand</p>
              <p className="text-[12px] text-[#767676]">Parts & accessories requested by customers</p>
            </div>
          </Link>

          {role === "ADMIN" && (
            <>
              <Link
                href="/reports"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-3 rounded-[10px] p-3 text-[14px] font-medium text-[#121212] hover:bg-[#F7F7F8] transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-[#767676]" />
                <div>
                  <p className="font-semibold text-[#121212]">Reports & Revenue</p>
                  <p className="text-[12px] text-[#767676]">Download PDF/Excel reports & analytics</p>
                </div>
              </Link>

              <Link
                href="/staff"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-3 rounded-[10px] p-3 text-[14px] font-medium text-[#121212] hover:bg-[#F7F7F8] transition-colors"
              >
                <UserCog className="h-5 w-5 text-[#767676]" />
                <div>
                  <p className="font-semibold text-[#121212]">Staff Management</p>
                  <p className="text-[12px] text-[#767676]">Manage technicians & shop access</p>
                </div>
              </Link>
            </>
          )}

          <div className="border-t border-[#EBEBEB] pt-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setIsMoreOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 rounded-[10px] p-3 text-[14px] font-medium text-[#C5221F] hover:bg-[#FDE8E8] transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 text-[#C5221F]" />
              <span className="font-semibold">Sign Out ({userName || "Staff"})</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Floating Action Button (New Intake) */}
      {showFab && (
        <button
          type="button"
          onClick={() => setIsForkOpen(true)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#121212] text-white shadow-xl hover:bg-black active:scale-95 transition-all lg:hidden cursor-pointer"
          aria-label="New Intake"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {/* Intake Fork: Choose Repair vs Order Stock vs Sell Accessory */}
      <IntakeForkModal
        isOpen={isForkOpen}
        onClose={() => setIsForkOpen(false)}
        onSelectStockOrder={() => setIsStockModalOpen(true)}
        onSelectSellAccessory={() => setIsSellAccessoryModalOpen(true)}
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

      {/* Sell In-Shop Accessory & Generate Warranty Bill Modal */}
      <SellAccessoryModal
        isOpen={isSellAccessoryModalOpen}
        onClose={() => setIsSellAccessoryModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("fm:refresh"));
        }}
      />
    </div>
  );
}
