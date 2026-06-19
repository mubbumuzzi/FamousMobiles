import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiTone, kpiTones } from "@/lib/design-tokens";
import { Skeleton } from "@/components/ui/skeleton";

type KpiCardProps = {
  label: string;
  value: string | number | null;
  icon?: LucideIcon;
  tone?: KpiTone;
  subtitle?: string;
  className?: string;
};

export function KpiCard({ label, value, icon: Icon, tone = "primary", subtitle, className }: KpiCardProps) {
  const colors = kpiTones[tone];
  return (
    <div className={cn("premium-card p-4 animate-fade-in", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {value === null ? (
            <Skeleton className="mb-2 h-9 w-20" />
          ) : (
            <p className={cn("text-3xl font-bold tracking-tight", colors.text)}>{value}</p>
          )}
          <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
        )}
      </div>
    </div>
  );
}
