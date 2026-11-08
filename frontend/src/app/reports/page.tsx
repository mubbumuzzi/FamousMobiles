"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/useAuth";
import { getApiUrl, getAccessToken } from "@/lib/api";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const download = async (path: string, filename: string) => {
    const res = await fetch(`${getApiUrl()}${path}`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  };

  if (authLoading) return null;
  if (user?.role !== "ADMIN") {
    return (
      <StaffLayout userName={user?.fullName} role={user?.role}>
        <p className="text-slate-600">Only admins can access reports.</p>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 max-w-lg animate-fade-in text-[#121212]">
        <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">Reports</h1>
        <Card className="rounded-[12px] border-[#EBEBEB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <CardHeader><CardTitle className="text-sm font-semibold text-[#121212]">Date Range</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[10px] border-[#EBEBEB]" /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[10px] border-[#EBEBEB]" /></div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start rounded-[10px] border-[#EBEBEB] text-[#121212] hover:bg-[#F7F7F8] cursor-pointer" onClick={() => download(`/reports/repairs?from=${from}&to=${to}&format=pdf`, "repairs.pdf")}>
            <Download className="h-4 w-4 mr-2 text-[#767676]" /> Repair Report (PDF)
          </Button>
          <Button variant="outline" className="w-full justify-start rounded-[10px] border-[#EBEBEB] text-[#121212] hover:bg-[#F7F7F8] cursor-pointer" onClick={() => download(`/reports/repairs?from=${from}&to=${to}&format=xlsx`, "repairs.xlsx")}>
            <Download className="h-4 w-4 mr-2 text-[#767676]" /> Repair Report (Excel)
          </Button>
        </div>
      </div>
    </StaffLayout>
  );
}
