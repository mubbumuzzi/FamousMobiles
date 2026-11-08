import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
}) {
  const variants = {
    default: "bg-[#F0F0F2] text-[#121212]",
    success: "bg-[#EAF6EE] text-[#0E8345]",
    warning: "bg-[#FFF4EB] text-[#B35300]",
    destructive: "bg-[#FDE8E8] text-[#C5221F]",
    outline: "border border-[#EBEBEB] text-[#121212] bg-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
