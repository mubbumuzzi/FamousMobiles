import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiTone } from "@/lib/design-tokens";
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
  tone = "primary",
  subtitle,
  className,
  onClick,
  isSelected,
  badge,
}: KpiCardProps) {
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
        "relative flex min-h-[96px] flex-col justify-between rounded-[12px] border border-[#EBEBEB] bg-white p-3.5 text-left transition-all select-none",
        isClickable && "cursor-pointer hover:border-[#DFDFDF] hover:bg-[#F7F7F8] active:scale-[0.99] group",
        isSelected && "border-[#121212] bg-[#F7F7F8] ring-1 ring-[#121212]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5 truncate text-[12px] font-medium text-[#767676]">
          {tone === "success" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0E8345]" />}
          {tone === "warning" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B35300]" />}
          {tone === "danger" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5221F]" />}
          <span className="truncate">{label}</span>
        </span>
        {isClickable && (
          <ChevronRight className="h-3.5 w-3.5 text-[#767676] opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>

      <div>
        {value === null ? (
          <Skeleton className="my-1 h-7 w-16" />
        ) : (
          <p className="text-[28px] font-bold tracking-tight text-[#121212] leading-none">
            {value}
          </p>
        )}
      </div>

      <div className="min-h-[14px]">
        {badge ? (
          <span className="inline-block rounded-full bg-[#FDE8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#C5221F]">
            {badge}
          </span>
        ) : subtitle ? (
          <p className="truncate text-[11px] text-[#767676]">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
