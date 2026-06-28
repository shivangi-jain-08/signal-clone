"use client";

import { useRef, useCallback, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { ReplyPreview } from "./ReplyPreview";
import type { ReplyPreview as ReplyPreviewType } from "@/types/models";
import { useTyping } from "../hooks/useTyping";
import { useConversationStore } from "@/store/conversationStore";

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string, opts?: { replyToId?: string }) => void;
  replyTo: ReplyPreviewType | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

export function MessageInput({
  conversationId,
  onSend,
  replyTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { emitTyping, cancelTyping } = useTyping(conversationId);
  const draft = useConversationStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useConversationStore((s) => s.setDraft);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setDraft(conversationId, el.value);
    emitTyping();
    // Auto-grow
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }, [conversationId, emitTyping, setDraft]);

  const handleSend = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const content = el.value.trim();
    if (!content) return;
    onSend(content, { replyToId: replyTo?.id });
    el.value = "";
    el.style.height = "auto";
    setDraft(conversationId, "");
    cancelTyping();
    onCancelReply();
  }, [conversationId, onSend, replyTo, cancelTyping, onCancelReply, setDraft]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-app)",
        flexShrink: 0,
      }}
    >
      {/* Reply preview */}
      {replyTo && <ReplyPreview reply={replyTo} onCancel={onCancelReply} />}

      <div
        className="px-2 md:px-4"
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: "8px 0",
          minHeight: 64,
        }}
      >
        <textarea
          ref={textareaRef}
          id="message-input"
          rows={1}
          disabled={disabled}
          placeholder="Message"
          defaultValue={draft}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={cancelTyping}
          style={{
            flex: 1,
            resize: "none",
            outline: "none",
            border: "none",
            backgroundColor: "var(--color-bg-input)",
            color: "var(--color-text-primary)",
            borderRadius: 20,
            padding: "10px 16px",
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: "inherit",
            minHeight: 44,
            maxHeight: 168,
            overflowY: "auto",
            transition: "height 100ms",
          }}
        />

        <button
          type="button"
          id="send-button"
          onClick={handleSend}
          disabled={disabled}
          aria-label="Send message"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background-color 150ms",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-accent)")
          }
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
