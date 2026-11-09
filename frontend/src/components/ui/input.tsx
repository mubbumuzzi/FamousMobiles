import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClassName =
  "flex h-12 sm:h-10 w-full rounded-xl sm:rounded-lg border border-[#EBEBEB] hover:border-[#DFDFDF] bg-white px-3.5 py-2.5 sm:px-3 sm:py-2 text-base sm:text-sm text-[#121212] placeholder:text-[#767676] outline-none ring-[#121212]/15 focus:ring-2 focus:border-[#121212] [color-scheme:light] [-webkit-text-fill-color:#121212] placeholder:[-webkit-text-fill-color:#767676] transition-all";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputClassName, className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-xl sm:rounded-lg border border-[#EBEBEB] hover:border-[#DFDFDF] bg-white px-3.5 py-2.5 sm:px-3 sm:py-2 text-base sm:text-sm text-[#121212] placeholder:text-[#767676] outline-none ring-[#121212]/15 focus:ring-2 focus:border-[#121212] [color-scheme:light] [-webkit-text-fill-color:#121212] placeholder:[-webkit-text-fill-color:#767676] transition-all",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const selectClassName =
  "flex h-12 sm:h-10 w-full rounded-xl sm:rounded-lg border border-[#EBEBEB] hover:border-[#DFDFDF] bg-white px-3.5 py-2.5 sm:px-3 sm:py-2 text-base sm:text-sm text-[#121212] outline-none ring-[#121212]/15 focus:ring-2 focus:border-[#121212] [color-scheme:light] [-webkit-text-fill-color:#121212] transition-all";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-[#121212]", className)} {...props} />;
}

export function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}
