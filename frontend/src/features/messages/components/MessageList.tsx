"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Message } from "@/types/models";
import { DateSeparator } from "@/components/common/DateSeparator";
import { MessageGroup } from "./MessageGroup";
import { TypingIndicator } from "./TypingIndicator";
import { Spinner } from "@/components/common/Spinner";
import { useAuthStore } from "@/store/authStore";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= todayStart) return "Today";
  if (t >= todayStart - 86_400_000) return "Yesterday";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface MessageListProps {
  /** All messages in chronological order (oldest first) */
  messages: Message[];
  isGroupChat: boolean;
  typingNames: string[];
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  onReply: (msg: Message) => void;
  conversationId: string;
}

/** Group consecutive messages from the same sender within 2 minutes */
function groupMessages(
  messages: Message[],
): Array<{ sender_id: string; messages: Message[] }> {
  const groups: Array<{ sender_id: string; messages: Message[] }> = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const timeDiff = last
      ? new Date(msg.created_at).getTime() -
        new Date(last.messages[last.messages.length - 1]!.created_at).getTime()
      : Infinity;
    if (
      last &&
      last.sender_id === msg.sender.id &&
      msg.message_type !== "system" &&
      timeDiff < 2 * 60 * 1000
    ) {
      last.messages.push(msg);
    } else {
      groups.push({ sender_id: msg.sender.id, messages: [msg] });
    }
  }
  return groups;
}

/** Insert date separators between groups that cross a day boundary */
type Item =
  | { type: "date"; date: string }
  | { type: "group"; senderId: string; messages: Message[] };

function buildItems(messages: Message[]): Item[] {
  const groups = groupMessages(messages);
  const items: Item[] = [];
  let lastDate = "";
  for (const g of groups) {
    const msgDate = g.messages[0]!.created_at.slice(0, 10); // YYYY-MM-DD
    if (msgDate !== lastDate) {
      items.push({ type: "date", date: g.messages[0]!.created_at });
      lastDate = msgDate;
    }
    items.push({ type: "group", senderId: g.sender_id, messages: g.messages });
  }
  return items;
}

export function MessageList({
  messages,
  isGroupChat,
  typingNames,
  hasMore,
  isFetchingMore,
  onLoadMore,
  onReply,
  conversationId,
}: MessageListProps) {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  const atBottomRef = useRef(true);

  // Track scroll position to decide whether to auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distFromBottom < 80;

    // Trigger load-more when user scrolls near top
    if (el.scrollTop < 80 && hasMore && !isFetchingMore) {
      prevScrollHeight.current = el.scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isFetchingMore, onLoadMore]);

  // Restore scroll position after prepending older messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || prevScrollHeight.current === 0) return;
    el.scrollTop = el.scrollHeight - prevScrollHeight.current;
    prevScrollHeight.current = 0;
  });

  // Auto-scroll to bottom on new messages if already near bottom
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, typingNames.length]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [conversationId]);

  const items = buildItems(messages);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 16px 16px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg-app)",
      }}
    >
      {/* Load more spinner */}
      {isFetchingMore && (
        <div className="flex justify-center py-3">
          <Spinner size="sm" />
        </div>
      )}

      {/* Items */}
      {items.map((item, idx) => {
        if (item.type === "date") {
          return <DateSeparator key={`date-${idx}`} label={formatDateLabel(item.date)} />;
        }
        return (
          <MessageGroup
            key={`group-${item.messages[0]!.id}`}
            messages={item.messages}
            isSelf={item.senderId === userId}
            isGroupChat={isGroupChat}
            onReply={onReply}
            conversationId={conversationId}
          />
        );
      })}

      {/* Typing indicator */}
      {typingNames.length > 0 && <TypingIndicator names={typingNames} />}

      <div ref={bottomRef} />
    </div>
  );
}
