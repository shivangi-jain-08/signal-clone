"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/services/api/conversations";
import { ConversationHeader } from "@/features/conversations/components/ConversationHeader";
import { MessageList } from "@/features/messages/components/MessageList";
import { MessageInput } from "@/features/messages/components/MessageInput";
import { GroupInfoPanel } from "@/features/groups/components/GroupInfoPanel";
import { EmptyState } from "@/components/common/EmptyState";
import { MessageListSkeleton } from "@/components/common/Skeleton";
import { useMessages } from "@/features/messages/hooks/useMessages";
import { useMessageSend } from "@/features/messages/hooks/useMessageSend";
import { useConversationStore } from "@/store/conversationStore";
import { useTypingStore } from "@/store/typingStore";
import { getSocket } from "@/services/socket/client";
import { Lock } from "lucide-react";
import type { Message, ReplyPreview } from "@/types/models";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

/** Stable empty array — must live at module scope so Zustand selector never returns a new reference */
const EMPTY_TYPING: string[] = [];

export default function ConversationPage({ params }: ConversationPageProps) {
  const { id } = use(params);
  const setActiveConversation = useConversationStore(
    (s) => s.setActiveConversation,
  );

  // Set active conversation on mount / change
  useEffect(() => {
    setActiveConversation(id);
    return () => setActiveConversation(null);
  }, [id, setActiveConversation]);

  const { data: conversation, isLoading: convLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => conversationsApi.get(id),
    staleTime: 60_000,
  });

  const {
    data: messagesData,
    isLoading: msgLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useMessages(id);

  const { send } = useMessageSend(id);

  // Typing state — selector returns undefined when no one is typing; fall back to stable module-level ref
  const typingRaw = useTypingStore((s) => s.typing[id]) ?? EMPTY_TYPING;
  const typingNames = typingRaw.map(
    (u) => u.split(":").slice(1).join(":") || u,
  );

  // Reply state
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const handleReply = useCallback((msg: Message) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender.id,
      deleted_at: msg.deleted_at,
    });
  }, []);
  const handleCancelReply = useCallback(() => setReplyTo(null), []);

  // Group info panel
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  // Mark-read
  const markRead = useCallback(() => {
    getSocket().emit("message_read", { conversation_id: id });
  }, [id]);

  // Flatten infinite pages: pages are newest-first, so reverse for display
  const messages = messagesData
    ? [...messagesData.pages].reverse().flatMap((p) => [...p.messages].reverse())
    : [];

  const isGroupChat = conversation?.type === "group";

  if (convLoading || msgLoading) {
    return (
      <div className="flex flex-col h-full">
        <div
          style={{
            height: 64,
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-app)",
          }}
        />
        <MessageListSkeleton />
      </div>
    );
  }

  if (!conversation) {
    return (
      <EmptyState
        icon={<Lock size={48} />}
        title="Conversation not found"
        subtitle="This conversation may have been deleted."
      />
    );
  }

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Main chat pane */}
      <div className="flex flex-col flex-1 min-w-0">
        <ConversationHeader
          conversation={conversation}
          onInfoClick={
            isGroupChat ? () => setInfoPanelOpen((p) => !p) : undefined
          }
        />

        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<Lock size={48} />}
              title="No messages yet"
              subtitle="Messages are end-to-end encrypted."
            />
          </div>
        ) : (
          <MessageList
            messages={messages}
            isGroupChat={isGroupChat}
            typingNames={typingNames}
            hasMore={!!hasNextPage}
            isFetchingMore={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            onReply={handleReply}
            conversationId={id}
          />
        )}

        <MessageInput
          conversationId={id}
          onSend={(content, opts) => {
            send(content, opts);
            markRead();
          }}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
        />
      </div>

      {/* Group info panel */}
      {isGroupChat && infoPanelOpen && conversation.group && (
        <GroupInfoPanel
          groupId={conversation.group.id}
          conversationId={id}
          onClose={() => setInfoPanelOpen(false)}
        />
      )}
    </div>
  );
}
