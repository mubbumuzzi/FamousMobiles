"use client";

import { useState } from "react";
import Link from "next/link";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
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
  const [results, setResults] = useState<SearchResult | null>(null);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults(null); return; }
    const data = await api<SearchResult>(`/search?q=${encodeURIComponent(q)}`);
    setResults(data);
  };

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Search</h1>
        <Input placeholder="Tracking ID, mobile, name, IMEI, model..." value={query} onChange={(e) => search(e.target.value)} autoFocus />
        {results && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Tickets ({results.tickets.length})</h2>
              {results.tickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`}>
                  <Card className="mb-2 hover:border-blue-300">
                    <CardContent className="flex justify-between p-3 text-sm">
                      <span className="font-medium text-blue-700">{t.trackingNumber}</span>
                      <span>{t.brand} {t.model}</span>
                      <span>{formatStatus(t.status)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div>
              <h2 className="font-semibold mb-2">Customers ({results.customers.length})</h2>
              {results.customers.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`}>
                  <Card className="mb-2 hover:border-blue-300">
                    <CardContent className="p-3 text-sm">
                      <span className="font-medium">{c.fullName}</span> · {c.mobile}
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
