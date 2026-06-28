"use client";

import { useState } from "react";
import type { Message } from "@/types/models";
import { Timestamp } from "@/components/common/Timestamp";
import { MessageStatus } from "./MessageStatus";
import { ReactionBar } from "./ReactionBar";
import { ReactionPicker } from "./ReactionPicker";
import { ReplyBubble } from "./ReplyBubble";
import { Reply, Trash2, Copy, SmilePlus } from "lucide-react";
import { messagesApi } from "@/services/api/messages";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { MessageList } from "@/services/api/messages";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  /** Position within a consecutive group for rounded corner shaping */
  position: "solo" | "top" | "middle" | "bottom";
  /** Show sender name label (group chats, non-self) */
  showSenderName?: boolean;
  onReply?: (msg: Message) => void;
  conversationId: string;
}

function senderColor(userId: string): string {
  const hash = userId
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `hsl(${hash % 360}, 60%, 55%)`;
}

function getBorderRadius(isSelf: boolean, position: string): string {
  const R = "18px";
  const r = "4px";
  if (isSelf) {
    switch (position) {
      case "top":    return `${R} ${r} ${r} ${R}`;
      case "middle": return `${R} ${r} ${r} ${R}`;
      case "bottom": return `${R} ${R} ${r} ${R}`;
      default:       return R;
    }
  } else {
    switch (position) {
      case "top":    return `${r} ${R} ${R} ${R}`;
      case "middle": return `${r} ${R} ${R} ${r}`;
      case "bottom": return `${R} ${R} ${R} ${r}`;
      default:       return R;
    }
  }
}

export function MessageBubble({
  message,
  isSelf,
  position,
  showSenderName,
  onReply,
  conversationId,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const qc = useQueryClient();

  const isDeleted = !!message.deleted_at;
  const isSystem = message.message_type === "system";

  // ── System message ────────────────────────────────────────────────────────
  if (isSystem) {
    return (
      <div
        className="flex justify-center py-1"
        style={{ padding: "2px 0" }}
      >
        <span
          className="text-system-msg px-3 py-1 rounded-full"
          style={{
            color: "var(--color-text-system)",
            backgroundColor: "rgba(128,128,128,0.1)",
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  const borderRadius = getBorderRadius(isSelf, position);
  const bgColor = isSelf
    ? "var(--color-bg-bubble-sent)"
    : "var(--color-bg-bubble-recv)";
  const textColor = isSelf
    ? "var(--color-text-bubble-sent)"
    : "var(--color-text-bubble-recv)";

  async function handleDelete() {
    await messagesApi.delete(message.id);
    qc.setQueryData<InfiniteData<MessageList>>(
      ["messages", conversationId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.id === message.id
                ? { ...m, deleted_at: new Date().toISOString(), content: "" }
                : m,
            ),
          })),
        };
      },
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(message.content).catch(() => {});
  }

  return (
    <div
      className={`flex w-full ${isSelf ? "justify-end" : "justify-start"}`}
      style={{ position: "relative", marginBottom: 2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPickerOpen(false);
      }}
    >
      <div className="max-w-[75%]" style={{ minWidth: 80, position: "relative" }}>
        {/* Sender name (group chat, non-self, top of group) */}
        {showSenderName && (position === "top" || position === "solo") && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: senderColor(message.sender.id),
              marginBottom: 2,
              paddingLeft: 4,
            }}
          >
            {message.sender.display_name}
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            backgroundColor: bgColor,
            borderRadius,
            padding: "8px 12px",
            position: "relative",
          }}
        >
          {/* Reply context */}
          {message.reply_to && !isDeleted && (
            <ReplyBubble reply={message.reply_to} isSelf={isSelf} />
          )}

          {/* Content */}
          {isDeleted ? (
            <span
              className="text-msg-content"
              style={{
                color: "var(--color-text-tertiary)",
                fontStyle: "italic",
              }}
            >
              This message was deleted
            </span>
          ) : (
            <span
              className="text-msg-content"
              style={{ color: textColor, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {message.content}
              {message.edited_at && (
                <span
                  style={{
                    fontSize: 11,
                    color: isSelf
                      ? "rgba(255,255,255,0.55)"
                      : "var(--color-text-tertiary)",
                    marginLeft: 4,
                  }}
                >
                  (edited)
                </span>
              )}
            </span>
          )}

          {/* Timestamp + status row */}
          <div
            className={`flex items-center gap-1 mt-1 ${isSelf ? "justify-end" : "justify-start"}`}
          >
            <Timestamp
              iso={message.created_at}
              variant="message"
              className={isSelf ? "opacity-55" : ""}
            />
            {isSelf && !isDeleted && (
              <MessageStatus status={message.status} size={13} />
            )}
          </div>
        </div>

        {/* Reactions */}
        {!isDeleted && message.reactions.length > 0 && (
          <ReactionBar reactions={message.reactions} />
        )}

        {/* Reaction picker */}
        {pickerOpen && !isDeleted && (
          <ReactionPicker
            messageId={message.id}
            conversationId={conversationId}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Hover action buttons */}
      {hovered && !isDeleted && (
        <div
          className={`flex items-center gap-0.5 absolute top-0 ${isSelf ? "right-full mr-2" : "left-full ml-2"}`}
          style={{ zIndex: 10 }}
        >
          {onReply && (
            <button
              type="button"
              title="Reply"
              onClick={() => onReply(message)}
              style={actionBtnStyle}
            >
              <Reply size={14} />
            </button>
          )}
          <button
            type="button"
            title="React"
            onClick={() => setPickerOpen((p) => !p)}
            style={actionBtnStyle}
          >
            <SmilePlus size={14} />
          </button>
          <button
            type="button"
            title="Copy"
            onClick={handleCopy}
            style={actionBtnStyle}
          >
            <Copy size={14} />
          </button>
          {isSelf && (
            <button
              type="button"
              title="Delete"
              onClick={handleDelete}
              style={{ ...actionBtnStyle, color: "var(--color-error)" }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  backgroundColor: "var(--color-bg-item-hover)",
  color: "var(--color-text-secondary)",
  transition: "background-color 80ms",
};
