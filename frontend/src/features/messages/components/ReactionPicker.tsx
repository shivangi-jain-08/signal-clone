"use client";

import { useState } from "react";
import { messagesApi } from "@/services/api/messages";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { Message, ReactionSummary } from "@/types/models";
import type { MessageList } from "@/services/api/messages";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface ReactionPickerProps {
  messageId: string;
  conversationId: string;
  onClose: () => void;
}

export function ReactionPicker({
  messageId,
  conversationId,
  onClose,
}: ReactionPickerProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handlePick(emoji: string) {
    if (loading) return;
    setLoading(true);
    try {
      const result = await messagesApi.react(messageId, emoji);
      // Patch cache
      qc.setQueryData<InfiniteData<MessageList>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m: Message) =>
                m.id === messageId
                  ? { ...m, reactions: result.reactions as ReactionSummary[] }
                  : m,
              ),
            })),
          };
        },
      );
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "4px 6px",
        backgroundColor: "var(--color-bg-modal)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        boxShadow: "var(--shadow-dropdown)",
        position: "absolute",
        zIndex: 50,
        top: -40,
      }}
    >
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handlePick(emoji)}
          style={{
            fontSize: 20,
            lineHeight: 1,
            padding: "2px",
            cursor: "pointer",
            background: "none",
            border: "none",
            borderRadius: "50%",
            transition: "transform 100ms",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.25)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
