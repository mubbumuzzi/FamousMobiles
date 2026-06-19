"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { API_URL, getAccessToken } from "@/lib/api";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const download = async (path: string, filename: string) => {
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  };

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Date Range</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => download(`/reports/repairs?from=${from}&to=${to}&format=pdf`, "repairs.pdf")}>
            <Download className="h-4 w-4 mr-2" /> Repair Report (PDF)
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => download(`/reports/repairs?from=${from}&to=${to}&format=xlsx`, "repairs.xlsx")}>
            <Download className="h-4 w-4 mr-2" /> Repair Report (Excel)
          </Button>
        </div>
      </div>
    </StaffLayout>
  );
}
