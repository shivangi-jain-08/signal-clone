import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout
        "h-12 w-full min-w-0 rounded-lg px-4 py-3",
        // Typography — matches UI spec "Input placeholder: 14px/400/1.5"
        "text-sm leading-relaxed",
        // Transition
        "transition-[border-color,box-shadow] duration-[80ms] outline-none",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-[var(--color-error)] aria-invalid:ring-2 aria-invalid:ring-[var(--color-error)]/20",
        className,
      )}
      style={{
        backgroundColor: "var(--color-bg-input)",
        color: "var(--color-text-primary)",
        border: "1px solid var(--color-border)",
        // focus ring via JS — can't set :focus-visible via inline style,
        // so we rely on the global :focus-visible rule in globals.css
        ...style,
      }}
      {...props}
    />
  )
}

export { Input }
