"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Max-width in px — defaults to 480 per UI spec */
  maxWidth?: number;
  children: ReactNode;
  /** Slot for footer action buttons */
  footer?: ReactNode;
  className?: string;
}

/**
 * Signal-themed dialog modal.
 * Thin wrapper over the Radix-based Dialog primitives that applies
 * the correct background, shadow, and border-radius from the design system.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  maxWidth = 480,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0 gap-0 border overflow-hidden", className)}
        style={{
          maxWidth,
          width: "calc(100vw - 2rem)",
          backgroundColor: "var(--color-bg-modal)",
          borderColor: "var(--color-border)",
          borderRadius: 12,
          boxShadow: "var(--shadow-modal)",
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <DialogTitle
            className="text-modal-title"
            style={{ color: "var(--color-text-primary)" }}
          >
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription
              className="text-msg-preview"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <DialogFooter
            className="px-6 py-4"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Re-export primitives so call sites don't need a second import */
export { Dialog, DialogTrigger } from "@/components/ui/dialog";
