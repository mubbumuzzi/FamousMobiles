import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickActionProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  tone?: "primary" | "secondary" | "success" | "accent";
  className?: string;
};

const tones = {
  primary: "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
  secondary: "from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700",
  success: "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
  accent: "from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800",
};

export function QuickAction({ href, icon: Icon, label, description, tone = "primary", className }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[72px] flex-col justify-center rounded-2xl bg-gradient-to-br p-4 text-white shadow-md transition-all active:scale-[0.98] hover:shadow-lg",
        tones[tone],
        className
      )}
    >
      <Icon className="mb-2 h-6 w-6 opacity-90" />
      <span className="text-sm font-bold leading-tight">{label}</span>
      {description && <span className="mt-0.5 text-xs opacity-80">{description}</span>}
    </Link>
  );
}
