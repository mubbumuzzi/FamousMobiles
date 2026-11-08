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
              "touch-target rounded-[8px] border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95",
              active
                ? "border-[#121212] bg-[#121212] text-white shadow-2xs"
                : "border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F7F7F8] hover:border-[#DFDFDF]"
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
