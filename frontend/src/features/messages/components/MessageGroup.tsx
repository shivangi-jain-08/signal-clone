"use client";

import type { Message } from "@/types/models";
import { Avatar } from "@/components/common/Avatar";
import { MessageBubble } from "./MessageBubble";

interface MessageGroupProps {
  messages: Message[];
  isSelf: boolean;
  isGroupChat: boolean;
  onReply?: (msg: Message) => void;
  conversationId: string;
}

/**
 * A consecutive run of messages from the same sender.
 * Shows avatar only on the last bubble (Signal style).
 */
export function MessageGroup({
  messages,
  isSelf,
  isGroupChat,
  onReply,
  conversationId,
}: MessageGroupProps) {
  const sender = messages[0]!.sender;
  const showAvatar = isGroupChat && !isSelf;

  return (
    <div
      className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
      style={{ marginBottom: 12 }}
    >
      {/* Avatar placeholder so bubbles stay aligned */}
      {showAvatar && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {/* only the last bubble in group shows avatar */}
          <div style={{ opacity: 1 }}>
            <Avatar
              src={sender.avatar_url}
              name={sender.display_name}
              userId={sender.id}
              size="sm"
            />
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}>
        {messages.map((msg, idx) => {
          const n = messages.length;
          const position =
            n === 1
              ? "solo"
              : idx === 0
              ? "top"
              : idx === n - 1
              ? "bottom"
              : "middle";

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSelf={isSelf}
              position={position}
              showSenderName={isGroupChat && !isSelf}
              onReply={onReply}
              conversationId={conversationId}
            />
          );
        })}
      </div>
    </div>
  );
}
