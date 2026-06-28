"use client";

import type { ReactionSummary } from "@/types/models";
import { useAuthStore } from "@/store/authStore";

interface ReactionBarProps {
  reactions: ReactionSummary[];
  onToggle?: (emoji: string) => void;
}

export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const userId = useAuthStore((s) => s.user?.id ?? "");

  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => {
        const reacted = r.user_ids.includes(userId);
        return (
          <button
            key={r.emoji}
            type="button"
            title={`${r.count} reaction${r.count !== 1 ? "s" : ""}`}
            onClick={() => onToggle?.(r.emoji)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 7px",
              borderRadius: 12,
              fontSize: 12,
              border: reacted
                ? "1px solid var(--color-accent)"
                : "1px solid var(--color-border)",
              backgroundColor: reacted
                ? "rgba(58,118,240,0.15)"
                : "var(--color-bg-item-hover)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              transition: "background-color 80ms",
            }}
          >
            <span>{r.emoji}</span>
            <span
              style={{
                color: reacted
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              {r.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
