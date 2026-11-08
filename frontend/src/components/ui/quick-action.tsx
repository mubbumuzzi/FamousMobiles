import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickActionProps = {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  label: string;
  description?: string;
  tone?: "primary" | "secondary" | "success" | "accent";
  className?: string;
};

export function QuickAction({ href, onClick, icon: Icon, label, description, tone = "primary", className }: QuickActionProps) {
  const isPrimary = tone === "primary";

  const classes = cn(
    "group flex min-h-[76px] flex-col justify-center rounded-[12px] p-4 text-left transition-all active:scale-[0.98]",
    isPrimary
      ? "bg-[#121212] text-white hover:bg-[#222222] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
      : "bg-white text-[#121212] border border-[#EBEBEB] hover:border-[#DFDFDF] hover:bg-[#F7F7F8] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    className
  );

  const content = (
    <>
      <div className={cn(
        "mb-2.5 flex h-9 w-9 items-center justify-center rounded-[8px] transition-transform group-hover:scale-105",
        isPrimary ? "bg-white/10 text-white" : "bg-[#F0F0F2] text-[#121212]"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={cn("text-[14px] font-bold leading-tight", isPrimary ? "text-white" : "text-[#121212]")}>{label}</span>
      {description && (
        <span className={cn("mt-0.5 text-[12px] leading-tight", isPrimary ? "text-white/70" : "text-[#767676]")}>{description}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href || "#"} className={classes}>
      {content}
    </Link>
  );
}
