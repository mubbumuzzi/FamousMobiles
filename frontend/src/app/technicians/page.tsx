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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Technicians</h1>
        <p className="text-sm text-slate-600">
          Technicians are added from Staff with the Technician role. They can log in and be assigned to repair jobs.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {techs.length === 0 && (
            <p className="text-sm text-slate-500 md:col-span-2">No technicians yet. Add one from the Staff page.</p>
          )}
          {techs.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-sm text-slate-500">{t.mobile} · {t.skillLevel}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Assigned: {t.assignedJobs ?? 0} · Completed: {t.completedJobs ?? 0}
                  {t.averageRepairTimeHours != null && ` · Avg: ${t.averageRepairTimeHours.toFixed(1)}h`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StaffLayout>
  );
}
