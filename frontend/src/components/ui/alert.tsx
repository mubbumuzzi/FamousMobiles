import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "warning" | "info";

const styles: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("rounded-lg border px-4 py-3 text-sm", styles[variant], className)}>
      {children}
    </div>
  );
}
