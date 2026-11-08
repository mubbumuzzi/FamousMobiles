"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { PageLoading, Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { Customer, Ticket } from "@/lib/types";
import { formatStatus, formatCustomerMobiles } from "@/lib/utils";
import { useStore } from "@/context/StoreContext";

interface SearchResult {
  tickets: Ticket[];
  customers: Customer[];
}

export default function SearchPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const { activeStoreId } = useStore();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 350);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    if (debouncedQuery.length < 2) {
      setResults(null);
      setError("");
      return;
    }
    setSearching(true);
    setError("");
    const storeParam = activeStoreId !== "ALL" ? `&storeId=${activeStoreId}` : "";
    api<SearchResult>(`/search?q=${encodeURIComponent(debouncedQuery)}${storeParam}`)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : "Search failed"))
      .finally(() => setSearching(false));
  }, [debouncedQuery, authLoading, user, activeStoreId]);

  if (authLoading) return <PageLoading />;

  const empty = results && results.tickets.length === 0 && results.customers.length === 0;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 animate-fade-in text-[#121212]">
        <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">Search</h1>
        <Input
          placeholder="Tracking ID, mobile, name, IMEI, model..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search records"
          className="h-11 rounded-[10px] border-[#EBEBEB] text-sm"
        />
        {searching && <Skeleton className="h-20 w-full rounded-[12px]" />}
        {error && <Alert variant="error">{error}</Alert>}
        {empty && <p className="text-sm text-[#767676]">No results for &quot;{debouncedQuery}&quot;</p>}
        {results && !empty && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="mb-2 text-[15px] font-bold text-[#121212]">Tickets ({results.tickets.length})</h2>
              {results.tickets.map((t) => (
                <Link key={t.id} href={`/tickets/view?id=${t.id}`} className="block mb-2">
                  <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 transition-all hover:border-[#DFDFDF] hover:bg-[#F7F7F8] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="grid gap-2 text-sm md:grid-cols-4">
                      <span className="font-mono font-bold text-[#121212]">{t.trackingNumber}</span>
                      <span className="font-semibold text-[#121212]">{t.brand} {t.model}</span>
                      <span>
                        <span className="block font-medium text-[#121212]">{t.customer.fullName}</span>
                        <span className="block text-xs text-[#767676] font-mono">{t.customer.mobile}</span>
                      </span>
                      <span className="text-xs font-semibold text-[#767676]">{formatStatus(t.status)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div>
              <h2 className="mb-2 text-[15px] font-bold text-[#121212]">Customers ({results.customers.length})</h2>
              {results.customers.map((c) => (
                <Link key={c.id} href={`/customers/view?id=${c.id}`} className="block mb-2">
                  <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 transition-all hover:border-[#DFDFDF] hover:bg-[#F7F7F8] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <p className="font-bold text-[#121212]">{c.fullName}</p>
                    <p className="text-xs text-[#767676] font-mono mt-0.5">{formatCustomerMobiles(c)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
