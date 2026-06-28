"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/common/Avatar";
import { UnreadBadge } from "@/components/common/Badge";
import { Timestamp } from "@/components/common/Timestamp";
import { useConversationStore } from "@/store/conversationStore";
import type { Conversation } from "@/types/models";

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  active?: boolean;
}

export function ConversationItem({ conversation, currentUserId, active }: ConversationItemProps) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const setActiveConversation = useConversationStore((s) => s.setActiveConversation);

  const isDirect = conversation.type === "direct";
  const other = isDirect
    ? conversation.participants.find((p) => p.id !== currentUserId)
    : null;

  const displayName = isDirect
    ? (other?.display_name ?? "Unknown")
    : (conversation.group?.name ?? "Group");

  const avatarSrc = isDirect ? other?.avatar_url : conversation.group?.avatar_url;
  const avatarId = isDirect ? (other?.id ?? "") : (conversation.group?.id ?? "");
  const isOnline = isDirect ? (other?.is_online ?? false) : false;

  const lastMsg = conversation.last_message;
  let preview: string | null = null;
  let previewDeleted = false;
  if (lastMsg) {
    if (lastMsg.deleted_at) {
      previewDeleted = true;
    } else {
      preview = lastMsg.content;
    }
  }

  function handleClick() {
    setActiveConversation(conversation.id);
    router.push("/conversations/" + conversation.id);
  }

  const bgColor = active
    ? "var(--color-bg-item-active)"
    : hovered
    ? "var(--color-bg-item-hover)"
    : "transparent";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 px-4 cursor-pointer select-none"
      style={{
        height: 72,
        backgroundColor: bgColor,
        boxShadow: "inset 0 -1px 0 var(--color-divider)",
        transition: "background-color 80ms",
      }}
    >
      <Avatar
        src={avatarSrc}
        name={displayName}
        userId={avatarId}
        size="lg"
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-conv-name truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {displayName}
          </span>
          <Timestamp iso={conversation.updated_at} variant="conversation" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-msg-preview truncate"
            style={{
              color: "var(--color-text-secondary)",
              fontStyle: previewDeleted ? "italic" : "normal",
            }}
          >
            {previewDeleted
              ? "This message was deleted"
              : preview ?? ""}
          </span>
          <UnreadBadge count={conversation.unread_count} />
        </div>
      </div>
    </div>
  );
}
