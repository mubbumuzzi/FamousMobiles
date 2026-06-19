import { cn } from "@/lib/utils";

type ChipSelectProps = {
  options: readonly string[] | string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
};

export function ChipSelect({ options, selected, onChange, className }: ChipSelectProps) {
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter((i) => i !== item) : [...selected, item]);
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((item) => {
        const active = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            className={cn(
              "touch-target rounded-full border px-4 py-2 text-sm font-medium transition-all",
              active
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
