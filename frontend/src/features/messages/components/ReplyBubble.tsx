"use client";

import type { ReplyPreview as ReplyPreviewType } from "@/types/models";
import { Reply } from "lucide-react";

interface ReplyBubbleProps {
  reply: ReplyPreviewType;
  /** Whether this bubble sits inside a sent (own) message bubble */
  isSelf?: boolean;
}

/** Quoted reply context shown inside a message bubble */
export function ReplyBubble({ reply, isSelf = false }: ReplyBubbleProps) {
  const text = reply.deleted_at ? "This message was deleted" : reply.content;
  const isDeleted = !!reply.deleted_at;

  return (
    <div
      style={{
        borderLeft: "3px solid var(--color-accent)",
        paddingLeft: 8,
        marginBottom: 6,
        maxWidth: "100%",
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <Reply size={11} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
        <span
          style={{
            fontSize: 11,
            color: "var(--color-accent)",
            fontWeight: 600,
          }}
        >
          Reply
        </span>
      </div>
      <span
        style={{
          display: "block",
          fontSize: 12,
          lineHeight: 1.4,
          color: isSelf
            ? "rgba(255,255,255,0.7)"
            : "var(--color-text-secondary)",
          fontStyle: isDeleted ? "italic" : "normal",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 220,
        }}
      >
        {text}
      </span>
    </div>
  );
}
