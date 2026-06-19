"use client";

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
} from "lucide-react";
import { clearTokens } from "@/lib/api";
import { cn, formatRole } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tickets", label: "Repairs", icon: Wrench },
  { href: "/customers", label: "Customers", icon: Users, hideFor: ["TECHNICIAN"] as string[] },
  { href: "/search", label: "Search", icon: Search },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/staff", label: "Staff", icon: UserCog, adminOnly: true },
];

export function StaffLayout({ children, userName, role }: { children: React.ReactNode; userName?: string; role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && role !== "ADMIN") return false;
    if (item.hideFor?.includes(role ?? "")) return false;
    return true;
  });

  const logout = () => {
    clearTokens();
    router.push("/login");
  };

  const showFab = pathname !== "/tickets/new";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-slate-900 transition-opacity hover:opacity-90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-header text-white shadow-md">
              <Smartphone className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Famous Mobiles</span>
          </Link>
          <div className="flex items-center gap-2">
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden">
        <div className="flex justify-around py-2">
          {visibleNavItems.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium touch-target",
                pathname.startsWith(href) ? "text-blue-700" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-5 w-5", pathname.startsWith(href) && "text-blue-600")} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* FAB — New Repair */}
      {showFab && (
        <Link
          href="/tickets/new"
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg transition-transform active:scale-95 md:bottom-6 md:right-6"
          aria-label="New repair"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
