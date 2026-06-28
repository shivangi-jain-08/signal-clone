"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { create } from "zustand";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "default" | "success" | "error" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration: number;
}

// ---------------------------------------------------------------------------
// Store — module-level, not exported (use `toast.*` helpers instead)
// ---------------------------------------------------------------------------

interface ToastStore {
  items: ToastItem[];
  add: (item: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

const useToastStore = create<ToastStore>()((set) => ({
  items: [],
  add: (item) =>
    set((s) => ({
      // Cap at 3 visible; drop oldest when full
      items: [
        ...s.items.slice(-2),
        { ...item, id: crypto.randomUUID() },
      ],
    })),
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

// ---------------------------------------------------------------------------
// Public API — call from any file (no React context needed)
// ---------------------------------------------------------------------------

type ToastOptions = Partial<Pick<ToastItem, "action" | "duration">>;

function add(type: ToastType, message: string, opts?: ToastOptions) {
  useToastStore.getState().add({
    type,
    message,
    duration: opts?.duration ?? (type === "error" ? 8000 : 4000),
    action: opts?.action,
  });
}

export const toast = {
  default: (message: string, opts?: ToastOptions) => add("default", message, opts),
  success: (message: string, opts?: ToastOptions) => add("success", message, opts),
  error:   (message: string, opts?: ToastOptions) => add("error",   message, opts),
  warning: (message: string, opts?: ToastOptions) => add("warning", message, opts),
};

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<ToastType, ReactNode> = {
  default: <Info    size={16} />,
  success: <CheckCircle   size={16} />,
  error:   <XCircle       size={16} />,
  warning: <AlertTriangle size={16} />,
};

const TYPE_COLOUR: Record<ToastType, string> = {
  default: "var(--color-accent)",
  success: "var(--color-online)",
  error:   "var(--color-error)",
  warning: "#FFB74D",
};

// ---------------------------------------------------------------------------
// Individual toast card
// ---------------------------------------------------------------------------

function ToastCard({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    const timer = setTimeout(() => remove(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, remove]);

  const dismiss = useCallback(() => remove(item.id), [item.id, remove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg"
      style={{
        backgroundColor: "var(--color-bg-modal)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-toast)",
        maxWidth: 320,
        width: "100%",
        animation: "toast-in 200ms ease-out forwards",
      }}
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0" style={{ color: TYPE_COLOUR[item.type] }}>
        {TYPE_ICON[item.type]}
      </span>

      {/* Message + action */}
      <div className="flex-1 min-w-0">
        <p
          className="text-msg-content leading-snug"
          style={{ color: "var(--color-text-primary)" }}
        >
          {item.message}
        </p>
        {item.action && (
          <button
            type="button"
            className="mt-1 text-msg-preview font-medium underline-offset-2 hover:underline"
            style={{ color: TYPE_COLOUR[item.type] }}
            onClick={() => { item.action!.onClick(); dismiss(); }}
          >
            {item.action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-[var(--color-bg-item-hover)]"
        style={{ color: "var(--color-text-tertiary)" }}
        onClick={dismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toaster — render once in Providers
// ---------------------------------------------------------------------------

export function Toaster() {
  const items = useToastStore((s) => s.items);
  if (items.length === 0) return null;

  return (
    <>
      {/* Keyframe injected once */}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Stack — bottom-right desktop, bottom-center mobile */}
      <div
        className="fixed z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
        style={{
          bottom: 24,
          right: 24,
        }}
      >
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} />
          </div>
        ))}
      </div>
    </>
  );
}
