"use client";

import { useConversationList } from "@/features/conversations/hooks/useConversationList";
import { useAuthStore } from "@/store/authStore";
import { useConversationStore } from "@/store/conversationStore";
import { ConversationListSkeleton } from "@/components/common/Skeleton";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  searchQuery: string;
}

export function ConversationList({ searchQuery }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversationList();
  const user = useAuthStore((s) => s.user);
  const activeConversationId = useConversationStore((s) => s.activeConversationId);

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8 text-msg-preview"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        No conversations yet
      </div>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? conversations.filter((conv) => {
        const isDirect = conv.type === "direct";
        if (isDirect) {
          const other = conv.participants.find((p) => p.id !== user?.id);
          return other?.display_name.toLowerCase().includes(q) ?? false;
        }
        return conv.group?.name.toLowerCase().includes(q) ?? false;
      })
    : conversations;

  if (filtered.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8 text-msg-preview"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        No results for &ldquo;{searchQuery}&rdquo;
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {filtered.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          currentUserId={user?.id ?? ""}
          active={conv.id === activeConversationId}
        />
      ))}
    </div>
  );
}
