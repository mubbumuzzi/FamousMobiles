"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = "md",
}: BottomSheetProps) {
  // Support Android hardware back button dismissal
  useAndroidBackButton(onClose, isOpen, 20);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (!isOpen) return;
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "relative flex max-h-[90dvh] w-full flex-col rounded-t-[20px] sm:rounded-[12px] bg-white border border-[#EBEBEB] shadow-2xl overflow-hidden transition-all",
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {/* Mobile drag handle */}
        <div className="flex w-full items-center justify-center pt-2.5 pb-1 sm:hidden">
          <div className="sheet-handle" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-[#EBEBEB] px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="min-w-0 flex-1 pr-2">
              {title && (
                <h3 className="text-[15px] leading-[20px] font-bold text-[#121212] truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[12px] leading-[16px] text-[#767676] mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="touch-target -mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-[#767676] hover:bg-[#F7F7F8] hover:text-[#121212] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-[#121212] text-[14px] leading-[20px]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="border-t border-[#EBEBEB] bg-[#F7F7F8]/80 px-4 py-3 sm:px-5 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
