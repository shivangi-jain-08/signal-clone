"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Message } from "@/types/models";
import { DateSeparator } from "@/components/common/DateSeparator";
import { MessageGroup } from "./MessageGroup";
import { TypingIndicator } from "./TypingIndicator";
import { Spinner } from "@/components/common/Spinner";
import { useAuthStore } from "@/store/authStore";
import { parseUtc } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function formatDateLabel(iso: string): string {
  const d = parseUtc(iso);
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
  /** Number of unread messages at the time the conversation was opened */
  unreadCount?: number;
}

/** Group consecutive messages from the same sender within 2 minutes */
function groupMessages(
  messages: Message[],
): Array<{ sender_id: string; messages: Message[] }> {
  const groups: Array<{ sender_id: string; messages: Message[] }> = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const timeDiff = last
      ? parseUtc(msg.created_at).getTime() -
        parseUtc(last.messages[last.messages.length - 1]!.created_at).getTime()
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

type Item =
  | { type: "date"; date: string }
  | { type: "group"; senderId: string; messages: Message[] }
  | { type: "unread-divider"; count: number };

function buildItems(messages: Message[], unreadCount: number): Item[] {
  const groups = groupMessages(messages);
  const items: Item[] = [];
  let lastDate = "";

  // Index of the first unread message in the flat array; -1 = no unread
  const firstUnreadIdx = unreadCount > 0 ? Math.max(0, messages.length - unreadCount) : -1;
  let msgCount = 0;
  let dividerInserted = firstUnreadIdx < 0;

  for (const g of groups) {
    const groupStart = msgCount;
    msgCount += g.messages.length;

    // Unread boundary falls inside this group — split it
    if (!dividerInserted && firstUnreadIdx > groupStart && firstUnreadIdx < msgCount) {
      const splitAt = firstUnreadIdx - groupStart;
      const readMsgs = g.messages.slice(0, splitAt);
      const unreadMsgs = g.messages.slice(splitAt);

      const d = readMsgs[0]!.created_at.slice(0, 10);
      if (d !== lastDate) {
        items.push({ type: "date", date: readMsgs[0]!.created_at });
        lastDate = d;
      }
      items.push({ type: "group", senderId: g.sender_id, messages: readMsgs });
      items.push({ type: "unread-divider", count: unreadCount });
      items.push({ type: "group", senderId: g.sender_id, messages: unreadMsgs });
      dividerInserted = true;
      continue;
    }

    const dateStr = g.messages[0]!.created_at.slice(0, 10);
    if (dateStr !== lastDate) {
      items.push({ type: "date", date: g.messages[0]!.created_at });
      lastDate = dateStr;
    }

    // Boundary is exactly at the start of this group
    if (!dividerInserted && msgCount > firstUnreadIdx) {
      items.push({ type: "unread-divider", count: unreadCount });
      dividerInserted = true;
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
  unreadCount = 0,
}: MessageListProps) {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  const atBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

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

  // Reset scroll tracking when the conversation changes
  useEffect(() => {
    initialScrollDoneRef.current = false;
    atBottomRef.current = true;
  }, [conversationId]);

  // Initial scroll: go to unread divider when there are unread messages, otherwise bottom.
  // After initial scroll: auto-scroll to bottom whenever a new message arrives and the
  // user is already near the bottom (or when the typing indicator appears/disappears).
  useEffect(() => {
    if (messages.length === 0) return;

    if (!initialScrollDoneRef.current) {
      if (unreadCount > 0 && unreadDividerRef.current) {
        unreadDividerRef.current.scrollIntoView({ behavior: "instant" });
        atBottomRef.current = false;
      } else {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      }
      initialScrollDoneRef.current = true;
      return;
    }

    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationId, messages.length, typingNames.length, unreadCount]);

  const items = buildItems(messages, unreadCount);

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
        if (item.type === "unread-divider") {
          return (
            <div
              key="unread-divider"
              ref={unreadDividerRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-accent)", opacity: 0.5 }} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  whiteSpace: "nowrap",
                  padding: "2px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--color-accent)",
                  opacity: 0.85,
                }}
              >
                {item.count} unread message{item.count !== 1 ? "s" : ""}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-accent)", opacity: 0.5 }} />
            </div>
          );
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
