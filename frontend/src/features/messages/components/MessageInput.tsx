"use client";

import { useRef, useState, useCallback, useEffect, KeyboardEvent } from "react";
import { Send, Paperclip, FileIcon, X, Loader2 } from "lucide-react";
import { ReplyPreview } from "./ReplyPreview";
import type { ReplyPreview as ReplyPreviewType } from "@/types/models";
import type { MessageType } from "@/types/models";
import { useTyping } from "../hooks/useTyping";
import { useConversationStore } from "@/store/conversationStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "@/components/ui/toast";

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string, opts?: { replyToId?: string; messageType?: MessageType }) => void;
  replyTo: ReplyPreviewType | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function AttachmentPreview({
  file,
  preview,
  onCancel,
}: {
  file: File;
  preview: string | null;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {preview ? (
        <img
          src={preview}
          alt="preview"
          style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <FileIcon size={24} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-btn truncate" style={{ color: "var(--color-text-primary)" }}>
          {file.name}
        </p>
        <p className="text-timestamp" style={{ color: "var(--color-text-tertiary)" }}>
          {formatBytes(file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Remove attachment"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          backgroundColor: "transparent",
          color: "var(--color-text-secondary)",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function MessageInput({
  conversationId,
  onSend,
  replyTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { emitTyping, cancelTyping } = useTyping(conversationId);
  const draft = useConversationStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useConversationStore((s) => s.setDraft);

  const [pending, setPending] = useState<{ file: File; preview: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Revoke object URL when pending changes or on unmount
  useEffect(() => {
    return () => {
      if (pending?.preview) URL.revokeObjectURL(pending.preview);
    };
  }, [pending]);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setDraft(conversationId, el.value);
    emitTyping();
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }, [conversationId, emitTyping, setDraft]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    setPending({ file, preview: isImage ? URL.createObjectURL(file) : null });
    e.target.value = "";
  }, []);

  const handleSend = useCallback(async () => {
    if (uploading || disabled) return;

    if (pending) {
      setUploading(true);
      try {
        const att = await uploadToCloudinary(pending.file);
        const content =
          att.kind === "image"
            ? att.url
            : JSON.stringify({ url: att.url, name: att.name, size: att.size });
        onSend(content, { messageType: att.kind, replyToId: replyTo?.id });
        setPending(null);
        onCancelReply();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
      return;
    }

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
  }, [uploading, disabled, pending, replyTo, onSend, onCancelReply, conversationId, cancelTyping, setDraft]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const cancelPending = useCallback(() => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
    setPending(null);
  }, [pending]);

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

      {/* Attachment preview strip */}
      {pending && (
        <AttachmentPreview file={pending.file} preview={pending.preview} onCancel={cancelPending} />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div
        className="px-2 md:px-4"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 64,
        }}
      >
        {/* Paperclip button */}
        <button
          type="button"
          aria-label="Attach file"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: disabled || uploading ? 0.4 : 1,
            transition: "color 150ms, opacity 150ms",
          }}
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          id="message-input"
          rows={1}
          disabled={disabled || !!pending || uploading}
          placeholder={pending ? "Click send to upload" : "Message"}
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
            opacity: !!pending ? 0.5 : 1,
          }}
        />

        <button
          type="button"
          id="send-button"
          onClick={() => void handleSend()}
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
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
