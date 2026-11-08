"use client";

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Technician } from "@/lib/types";

export default function TechniciansPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [techs, setTechs] = useState<Technician[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    api<Technician[]>("/technicians").then(setTechs).catch(console.error);
  }, [authLoading, user]);

  if (authLoading) return null;

  return (
    <StaffLayout userName={user?.fullName} role={user?.role}>
      <div className="space-y-4 animate-fade-in text-[#121212]">
        <h1 className="text-[20px] leading-[24px] font-bold text-[#121212] tracking-tight">Technicians</h1>
        <p className="text-[12px] text-[#767676]">
          Technicians are added from Staff with the Technician role. They can log in and be assigned to repair jobs.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {techs.length === 0 && (
            <p className="text-sm text-[#767676] md:col-span-2">No technicians yet. Add one from the Staff page.</p>
          )}
          {techs.map((t) => (
            <div key={t.id} className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="font-bold text-[#121212]">{t.name}</p>
              <p className="text-xs text-[#767676] font-mono mt-0.5">{t.mobile} · {t.skillLevel}</p>
              <p className="text-[11px] text-[#767676] mt-2 pt-2 border-t border-[#EBEBEB]">
                Assigned: {t.assignedJobs ?? 0} · Completed: {t.completedJobs ?? 0}
                {t.averageRepairTimeHours != null && ` · Avg: ${t.averageRepairTimeHours.toFixed(1)}h`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
}
