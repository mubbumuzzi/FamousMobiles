import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" size="lg" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
