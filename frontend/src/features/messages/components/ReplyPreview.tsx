"use client";

import type { ReplyPreview as ReplyPreviewType } from "@/types/models";
import { Reply } from "lucide-react";

interface ReplyPreviewProps {
  reply: ReplyPreviewType;
  /** Call this to clear the pending reply in the input */
  onCancel?: () => void;
}

export function ReplyPreview({ reply, onCancel }: ReplyPreviewProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        backgroundColor: "var(--color-bg-item-hover)",
        borderTop: "1px solid var(--color-border)",
        borderLeft: "3px solid var(--color-accent)",
      }}
    >
      <Reply size={14} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
      <span
        className="text-msg-preview truncate flex-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {reply.deleted_at ? "This message was deleted" : reply.content}
      </span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
            fontSize: 16,
            lineHeight: 1,
            padding: 2,
          }}
          aria-label="Cancel reply"
        >
          ×
        </button>
      )}
    </div>
  );
}
