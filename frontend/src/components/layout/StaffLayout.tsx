"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Wrench, Package, BarChart3, Search, LogOut, Smartphone } from "lucide-react";
import { clearTokens } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Wrench },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/technicians", label: "Technicians", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/search", label: "Search", icon: Search },
];

export function StaffLayout({ children, userName, role }: { children: React.ReactNode; userName?: string; role?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearTokens();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-blue-700">
            <Smartphone className="h-5 w-5" />
            Famous Mobiles
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-slate-600">{userName} ({role})</span>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-4">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  pathname.startsWith(href) ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 px-2 text-xs", pathname.startsWith(href) ? "text-blue-700" : "text-slate-500")}>
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
