import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type WizardStepsProps = {
  steps: string[];
  current: number;
  className?: string;
};

export function WizardSteps({ steps, current, className }: WizardStepsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-1">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {i > 0 && <div className={cn("h-0.5 flex-1", done || active ? "bg-blue-500" : "bg-slate-200")} />}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                    done && "bg-blue-600 text-white shadow-md",
                    active && "bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg ring-4 ring-blue-100",
                    !done && !active && "bg-slate-100 text-slate-400"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={cn("h-0.5 flex-1", done ? "bg-blue-500" : "bg-slate-200")} />}
              </div>
              <span className={cn("hidden text-center text-[10px] font-medium sm:block", active ? "text-blue-700" : "text-slate-500")}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-slate-800 sm:hidden">{steps[current]}</p>
    </div>
  );
}
