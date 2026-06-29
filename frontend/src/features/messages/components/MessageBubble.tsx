"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Message } from "@/types/models";
import { Timestamp } from "@/components/common/Timestamp";
import { MessageStatus } from "./MessageStatus";
import { ReactionBar } from "./ReactionBar";
import { ReactionPicker } from "./ReactionPicker";
import { ReplyBubble } from "./ReplyBubble";
import { Reply, Trash2, Copy, SmilePlus, FileIcon, Download, X } from "lucide-react";
import { messagesApi } from "@/services/api/messages";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { MessageList } from "@/services/api/messages";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  position: "solo" | "top" | "middle" | "bottom";
  showSenderName?: boolean;
  onReply?: (msg: Message) => void;
  conversationId: string;
}

function senderColor(userId: string): string {
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `hsl(${hash % 360}, 60%, 55%)`;
}

function getBorderRadius(isSelf: boolean, position: string): string {
  const R = "20px";
  const r = "5px";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const qc = useQueryClient();
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const handleEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setHovered(true);
  }, []);

  const handleLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => {
      setHovered(false);
      setPickerOpen(false);
    }, 150);
  }, []);

  const isDeleted = !!message.deleted_at;
  const isSystem = message.message_type === "system";

  // ── System message ────────────────────────────────────────────────────────
  if (isSystem) {
    return (
      <div className="flex justify-center" style={{ padding: "2px 0" }}>
        <span
          className="text-system-msg px-3 py-1 rounded-full"
          style={{ color: "var(--color-text-system)", backgroundColor: "rgba(128,128,128,0.1)" }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  const borderRadius = getBorderRadius(isSelf, position);
  const bgColor = isSelf ? "var(--color-bg-bubble-sent)" : "var(--color-bg-bubble-recv)";
  const textColor = isSelf ? "var(--color-text-bubble-sent)" : "var(--color-text-bubble-recv)";

  function handleCopy() {
    let text = message.content;
    if (message.message_type === "file") {
      text = safeParseFile(message.content).url;
    }
    navigator.clipboard.writeText(text).catch(() => {});
  }

  async function handleDelete() {
    await messagesApi.delete(message.id);
    qc.setQueryData<InfiniteData<MessageList>>(["messages", conversationId], (old) => {
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
    });
  }

  // Action buttons — shared between both sides, order mirrors the side
  const actionBar = hovered && !isDeleted && (
    <div
      className="flex items-center shrink-0"
      style={{ gap: 2 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        title="React"
        onClick={() => setPickerOpen((p) => !p)}
        style={actionBtnStyle}
      >
        <SmilePlus size={14} />
      </button>
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
  );

  return (
    <div
      className={`flex w-full items-end ${isSelf ? "justify-end" : "justify-start"}`}
      style={{ gap: 4, marginBottom: 2 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Action bar sits to the LEFT for self/outgoing messages */}
      {isSelf && actionBar}

      {/* Bubble + picker wrapper */}
      <div className="max-w-[75%]" style={{ minWidth: 80, position: "relative" }}>
        {/* Sender name (group chats) */}
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
            padding:
              !isDeleted && (message.message_type === "image" || message.message_type === "file")
                ? "8px 12px 26px 12px"
                : "8px 12px 6px 12px",
            position: "relative",
          }}
        >
          {message.reply_to && !isDeleted && (
            <ReplyBubble reply={message.reply_to} isSelf={isSelf} />
          )}

          {isDeleted ? (
            <span
              className="text-msg-content"
              style={{
                color: isSelf ? "rgba(255,255,255,0.7)" : "var(--color-text-secondary)",
                fontStyle: "italic",
              }}
            >
              This message was deleted
              <span style={{ display: "inline-block", width: isSelf ? 62 : 42, height: 1 }} aria-hidden="true" />
            </span>
          ) : message.message_type === "image" ? (
            <>
              <img
                src={message.content}
                alt="image"
                onClick={() => setLightboxOpen(true)}
                style={{
                  maxWidth: 240,
                  maxHeight: 300,
                  width: "auto",
                  height: "auto",
                  borderRadius: 8,
                  display: "block",
                  cursor: "zoom-in",
                }}
              />
              {lightboxOpen && createPortal(
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1000,
                    backgroundColor: "rgba(0,0,0,0.88)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "zoom-out",
                  }}
                  onClick={() => setLightboxOpen(false)}
                >
                  <img
                    src={message.content}
                    alt="image"
                    style={{
                      maxWidth: "90vw",
                      maxHeight: "90vh",
                      objectFit: "contain",
                      borderRadius: 8,
                      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                      cursor: "default",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setLightboxOpen(false)}
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>,
                document.body,
              )}
            </>
          ) : message.message_type === "file" ? (
            (() => {
              const f = safeParseFile(message.content);
              return (
                <a
                  href={f.url}
                  download={f.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 180 }}
                >
                  <FileIcon size={22} style={{ color: textColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="truncate text-msg-content" style={{ color: textColor, fontWeight: 500 }}>
                      {f.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: isSelf ? "rgba(255,255,255,0.6)" : "var(--color-text-tertiary)",
                      }}
                    >
                      {formatFileBytes(f.size)}
                    </p>
                  </div>
                  <Download size={14} style={{ color: textColor, opacity: 0.7, flexShrink: 0 }} />
                </a>
              );
            })()
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
                    color: isSelf ? "rgba(255,255,255,0.55)" : "var(--color-text-tertiary)",
                    marginLeft: 4,
                  }}
                >
                  (edited)
                </span>
              )}
              <span style={{ display: "inline-block", width: isSelf ? 62 : 42, height: 1 }} aria-hidden="true" />
            </span>
          )}

          {/* Timestamp + status overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 5,
              right: 8,
              display: "flex",
              alignItems: "center",
              gap: 3,
              lineHeight: 1,
            }}
          >
            <Timestamp
              iso={message.created_at}
              variant="message"
              style={{ color: isSelf ? "rgba(255,255,255,0.65)" : "var(--color-text-timestamp)" }}
            />
            {isSelf && !isDeleted && <MessageStatus status={message.status} size={12} />}
          </div>
        </div>

        {/* Reactions */}
        {!isDeleted && message.reactions.length > 0 && (
          <ReactionBar reactions={message.reactions} />
        )}

        {/* Reaction picker — above bubble */}
        {pickerOpen && !isDeleted && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              paddingBottom: 6,
              zIndex: 50,
              ...(isSelf ? { right: 0 } : { left: 0 }),
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <ReactionPicker
              messageId={message.id}
              conversationId={conversationId}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Action bar sits to the RIGHT for incoming messages */}
      {!isSelf && actionBar}
    </div>
  );
}

function safeParseFile(content: string): { url: string; name: string; size: number } {
  try {
    return JSON.parse(content) as { url: string; name: string; size: number };
  } catch {
    return { url: content, name: "File", size: 0 };
  }
}

function formatFileBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
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
  backgroundColor: "var(--color-bg-app)",
  color: "var(--color-text-secondary)",
  transition: "background-color 80ms",
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
};
