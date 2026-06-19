import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClassName =
  "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none ring-blue-500 focus:ring-2 [color-scheme:light] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:#64748b]";

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
        "flex min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none ring-blue-500 focus:ring-2 [color-scheme:light] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:#64748b]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const selectClassName =
  "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 [color-scheme:light] [-webkit-text-fill-color:#0f172a]";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-slate-700", className)} {...props} />;
}

export function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}
