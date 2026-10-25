import { ChevronRight, LucideIcon } from "lucide-react";
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
  onClick?: () => void;
  isSelected?: boolean;
  badge?: string;
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  subtitle,
  className,
  onClick,
  isSelected,
  badge,
}: KpiCardProps) {
  const colors = kpiTones[tone];
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "premium-card relative p-4 transition-all duration-200 animate-fade-in text-left select-none",
        isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] group",
        isSelected && "ring-2 ring-blue-600 shadow-md bg-blue-50/30 border-blue-200",
        className
      )}
    >
      {badge && (
        <span className="absolute top-2 right-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {value === null ? (
            <Skeleton className="mb-2 h-9 w-20" />
          ) : (
            <p className={cn("text-3xl font-bold tracking-tight", colors.text)}>{value}</p>
          )}
          <div className="mt-1 flex items-center gap-1">
            <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
              {label}
            </p>
            {isClickable && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
        )}
      </div>
    </div>
  );
}
