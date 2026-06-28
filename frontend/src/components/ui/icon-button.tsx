"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const SIZE_PX = { sm: 28, md: 32, lg: 40 } as const;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  /** Required for screen-reader accessibility */
  "aria-label": string;
}

/**
 * Circular icon-only button with a hover background ring.
 * Wraps an icon (lucide-react or any SVG) and maintains a fixed hit-target.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size = "md", className, children, ...props }, ref) {
    const px = SIZE_PX[size];
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center shrink-0 rounded-full",
          "transition-colors duration-[80ms]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
          "disabled:opacity-50 disabled:pointer-events-none",
          className,
        )}
        style={{
          width: px,
          height: px,
          color: "var(--color-text-secondary)",
          outlineColor: "var(--color-accent)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-bg-item-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
