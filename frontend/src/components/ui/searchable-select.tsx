"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/input";

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
  id?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(value);
        }}
        className={cn(inputClassName, "pr-9")}
      />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#767676]"
        aria-hidden
      />
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-[12px] border border-[#EBEBEB] bg-white py-1 shadow-xl animate-in fade-in-50 zoom-in-95"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[#767676]">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(opt)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs text-[#121212] hover:bg-[#F7F7F8] cursor-pointer transition-colors",
                    opt === value && "bg-[#F0F0F2] font-semibold text-[#121212]"
                  )}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
