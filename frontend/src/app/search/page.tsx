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
import { formatStatus } from "@/lib/utils";

interface SearchResult {
  tickets: Ticket[];
  customers: Customer[];
}

export default function SearchPage() {
  const { user, loading: authLoading } = useAuthGuard();
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
    api<SearchResult>(`/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : "Search failed"))
      .finally(() => setSearching(false));
  }, [debouncedQuery, authLoading, user]);

  if (authLoading) return <PageLoading />;

  const empty = results && results.tickets.length === 0 && results.customers.length === 0;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Search</h1>
        <Input
          placeholder="Tracking ID, mobile, name, IMEI, model..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search records"
        />
        {searching && <Skeleton className="h-20 w-full" />}
        {error && <Alert variant="error">{error}</Alert>}
        {empty && <p className="text-sm text-slate-500">No results for &quot;{debouncedQuery}&quot;</p>}
        {results && !empty && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="mb-2 font-semibold">Tickets ({results.tickets.length})</h2>
              {results.tickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`}>
                  <Card className="mb-2 transition-all hover:border-blue-300 hover:shadow-md">
                    <CardContent className="grid gap-2 p-3 text-sm md:grid-cols-4">
                      <span className="font-medium text-blue-700">{t.trackingNumber}</span>
                      <span className="text-slate-900">{t.brand} {t.model}</span>
                      <span>
                        <span className="block font-medium text-slate-900">{t.customer.fullName}</span>
                        <span className="block text-slate-600">{t.customer.mobile}</span>
                      </span>
                      <span className="text-slate-900">{formatStatus(t.status)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Customers ({results.customers.length})</h2>
              {results.customers.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <Card className="mb-2 transition-all hover:border-blue-300 hover:shadow-md">
                    <CardContent className="p-3 text-sm">
                      <p className="font-medium text-slate-900">{c.fullName}</p>
                      <p className="text-slate-600">{c.mobile}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
