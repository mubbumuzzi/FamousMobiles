import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 active:scale-[0.98] select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-[#121212] text-white hover:bg-black shadow-xs",
        default: "bg-[#121212] text-white hover:bg-black shadow-xs",
        secondary: "border border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F7F7F8] hover:border-[#DFDFDF]",
        outline: "border border-[#EBEBEB] bg-white text-[#121212] hover:bg-[#F7F7F8] hover:border-[#DFDFDF]",
        ghost: "text-[#121212] hover:bg-[#F7F7F8]",
        destructive: "bg-[#C5221F] text-white hover:bg-[#A81D1A] shadow-xs",
      },
      size: {
        default: "min-h-[44px] h-11 px-4 py-2 text-[14px] leading-[20px]",
        sm: "min-h-[36px] h-9 px-3 text-[12px] leading-[16px]",
        lg: "min-h-[48px] h-12 px-6 text-[15px] leading-[20px]",
        icon: "min-h-[44px] h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
