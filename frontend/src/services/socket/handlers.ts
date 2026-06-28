import type { InfiniteData } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { usePresenceStore } from "@/store/presenceStore";
import { useTypingStore } from "@/store/typingStore";
import { useAuthStore } from "@/store/authStore";
import { useConversationStore } from "@/store/conversationStore";
import { getSocket } from "./client";
import { toast } from "@/components/ui/toast";
import type { Message, Conversation, ReactionSummary, ReplyPreview, MessageType, MessageStatus } from "@/types/models";
import type { ConversationList } from "@/services/api/conversations";
import type { MessageList } from "@/services/api/messages";

// ---------------------------------------------------------------------------
// Raw payload shapes emitted by the backend Socket.io server
// ---------------------------------------------------------------------------

interface RawReaction { emoji: string; user_id: string }

interface NewMessagePayload {
  id: string;
  conversation_id: string;
  sender: Message["sender"];
  content: string;
  message_type: MessageType;
  reply_to: ReplyPreview | null;
  deleted_at: string | null;
  edited_at: string | null;
  reactions: RawReaction[];
  client_id?: string;
  created_at: string;
  updated_at: string;
}

interface MessageEditedPayload {
  id: string;
  conversation_id: string;
  content: string;
  edited_at: string;
  sender_id: string;
}

interface MessageDeletedPayload {
  id: string;
  conversation_id: string;
  deleted_at: string;
}

interface ReactionUpdatedPayload {
  message_id: string;
  conversation_id: string;
  reactions: RawReaction[];
}

interface TypingPayload {
  conversation_id: string;
  user_id: string;
  display_name?: string;
  username?: string;
}

interface UserPresencePayload {
  user_id: string;
  last_seen?: string | null;
}

interface MessageStatusPayload {
  message_id: string;
  conversation_id: string;
  user_id: string;
  status: MessageStatus;
}

interface ConversationReadPayload {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

interface GroupUpdatedPayload {
  group_id: string;
  conversation_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
}

interface GroupDeletedPayload {
  group_id: string;
  conversation_id: string;
}

interface MemberPayload {
  group_id: string;
  conversation_id: string;
  group_name?: string;
  user_id: string;
  added_by?: string;
  removed_by?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupReactions(raw: RawReaction[]): ReactionSummary[] {
  const map = new Map<string, { count: number; user_ids: string[] }>();
  for (const { emoji, user_id } of raw) {
    const entry = map.get(emoji) ?? { count: 0, user_ids: [] };
    entry.count++;
    entry.user_ids.push(user_id);
    map.set(emoji, entry);
  }
  return [...map.entries()].map(([emoji, g]) => ({ emoji, ...g }));
}

function rawToMessage(raw: NewMessagePayload): Message {
  return {
    ...raw,
    reactions: groupReactions(raw.reactions),
    status: null,
  };
}

/** Prepend a message to the most-recent page of an infinite messages query. */
function prependMessage(
  convId: string,
  msg: Message,
): void {
  queryClient.setQueryData<InfiniteData<MessageList>>(
    ["messages", convId],
    (old) => {
      if (!old) return old;
      const [first, ...rest] = old.pages;
      if (!first) return old;
      // Skip if this message already exists (dedup by id or client_id)
      const exists = old.pages.some((p) =>
        p.messages.some(
          (m: Message) => m.id === msg.id || (msg.client_id && m.client_id === msg.client_id),
        ),
      );
      if (exists) return old;
      return {
        ...old,
        pages: [
          { ...first, messages: [msg, ...first.messages] },
          ...rest,
        ],
      };
    },
  );
}

/** Lift a conversation to the top of the list and update its preview. */
function bumpConversation(
  convId: string,
  updates: Partial<Pick<Conversation, "last_message" | "unread_count">>,
  updatedAt?: string,
): void {
  queryClient.setQueryData<ConversationList>(
    ["conversations"],
    (old) => {
      if (!old) return old;
      const idx = old.conversations.findIndex((c) => c.id === convId);
      if (idx === -1) {
        // Unknown conversation — refetch the list
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        return old;
      }
      const conv = old.conversations[idx]!;
      // Prefer server-provided timestamp (from the message) so refetches
      // don't flip the displayed time back to a stale client-clock value.
      const updated = { ...conv, ...updates, updated_at: updatedAt ?? conv.updated_at };
      const without = old.conversations.filter((c) => c.id !== convId);
      return {
        ...old,
        conversations: [updated, ...without],
      };
    },
  );
}

/** Update a single message in the infinite query by id. */
function patchMessage(
  convId: string,
  messageId: string,
  patch: Partial<Message>,
): void {
  queryClient.setQueryData<InfiniteData<MessageList>>(
    ["messages", convId],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m: Message) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
        })),
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Handler registration
// ---------------------------------------------------------------------------

export function registerSocketHandlers(): () => void {
  const socket = getSocket();
  const { setOnline, setOffline } = usePresenceStore.getState();

  // ── New message ──────────────────────────────────────────────────────────
  const onNewMessage = (raw: NewMessagePayload) => {
    const msg = rawToMessage(raw);
    prependMessage(raw.conversation_id, msg);

    const currentUserId = useAuthStore.getState().user?.id;
    const activeConvId = useConversationStore.getState().activeConversationId;
    const isOwnMessage = msg.sender.id === currentUserId;
    const isActiveConv = raw.conversation_id === activeConvId;

    // Compute new unread count only for others' messages in non-active conversations
    let unreadUpdate: { unread_count: number } | undefined;
    if (!isOwnMessage && !isActiveConv) {
      const currentList = queryClient.getQueryData<ConversationList>(["conversations"]);
      const currentConv = currentList?.conversations.find((c) => c.id === raw.conversation_id);
      unreadUpdate = { unread_count: (currentConv?.unread_count ?? 0) + 1 };

      // Toast notification for incoming messages from other conversations
      if (msg.message_type !== "system" && !msg.deleted_at) {
        const sender = msg.sender.display_name || msg.sender.username;
        const preview = msg.content.length > 55 ? msg.content.slice(0, 55) + "…" : msg.content;
        toast.default(`${sender}: ${preview}`, {
          duration: 5000,
          action: {
            label: "View",
            onClick: () => { window.location.href = `/conversations/${raw.conversation_id}`; },
          },
        });
      }
    }

    bumpConversation(
      raw.conversation_id,
      {
        last_message: {
          id: msg.id,
          content: msg.content,
          message_type: msg.message_type,
          sender_id: msg.sender.id,
          created_at: msg.created_at,
          deleted_at: null,
        },
        ...unreadUpdate,
      },
      msg.created_at, // use server timestamp — prevents flip on refetch
    );
  };

  // ── Message edited ───────────────────────────────────────────────────────
  const onMessageEdited = (p: MessageEditedPayload) => {
    patchMessage(p.conversation_id, p.id, {
      content: p.content,
      edited_at: p.edited_at,
    });
  };

  // ── Message deleted ──────────────────────────────────────────────────────
  const onMessageDeleted = (p: MessageDeletedPayload) => {
    patchMessage(p.conversation_id, p.id, {
      content: "",
      deleted_at: p.deleted_at,
    });
  };

  // ── Reactions ────────────────────────────────────────────────────────────
  const onReactionUpdated = (p: ReactionUpdatedPayload) => {
    const reactions = groupReactions(p.reactions);
    patchMessage(p.conversation_id, p.message_id, { reactions });
  };

  // ── Typing ─────────────────────────────────────────────────────────
  const { setTyping, clearTyping } = useTypingStore.getState();
  const onTyping = (p: TypingPayload) => {
    setTyping(p.conversation_id, p.user_id, p.display_name || p.username || p.user_id);
  };
  const onStopTyping = (p: TypingPayload) => {
    clearTyping(p.conversation_id, p.user_id);
  };

  // ── Presence ─────────────────────────────────────────────────────────────
  const onUserOnline = (p: UserPresencePayload) => {
    setOnline(p.user_id);
    // Patch any cached UserPublic objects across query cache
    queryClient.setQueriesData<{ data: { is_online: boolean } }>(
      { queryKey: ["user", p.user_id] },
      (old) => old ? { ...old, data: { ...old.data, is_online: true } } : old,
    );
  };

  const onUserOffline = (p: UserPresencePayload) => {
    setOffline(p.user_id, p.last_seen ?? null);
    queryClient.setQueriesData<{ data: { is_online: boolean; last_seen: string | null } }>(
      { queryKey: ["user", p.user_id] },
      (old) =>
        old
          ? { ...old, data: { ...old.data, is_online: false, last_seen: p.last_seen ?? null } }
          : old,
    );
  };

  // ── Message delivery/read status ─────────────────────────────────────────
  const onMessageStatusUpdate = (p: MessageStatusPayload) => {
    patchMessage(p.conversation_id, p.message_id, { status: p.status });
  };

  // ── Conversation read ──────────────────────────────────────────────────
  const onConversationRead = (p: ConversationReadPayload) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (p.user_id === currentUserId) {
      // Our own read confirmed by server — zero unread directly in cache
      queryClient.setQueryData<ConversationList>(
        ["conversations"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.map((c) =>
              c.id === p.conversation_id ? { ...c, unread_count: 0 } : c,
            ),
          };
        },
      );
    }
    // For other participants reading, their unread counts are irrelevant to us
  };

  // ── Group lifecycle ───────────────────────────────────────────────────────
  const onGroupUpdated = (p: GroupUpdatedPayload) => {
    queryClient.setQueryData<ConversationList>(
      ["conversations"],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map((c) =>
            c.group?.id === p.group_id
              ? {
                  ...c,
                  group: {
                    ...c.group!,
                    name: p.name,
                    description: p.description,
                    avatar_url: p.avatar_url,
                  },
                }
              : c,
          ),
        };
      },
    );
  };

  const onGroupDeleted = (p: GroupDeletedPayload) => {
    queryClient.setQueryData<ConversationList>(
      ["conversations"],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.filter(
            (c) => c.id !== p.conversation_id,
          ),
        };
      },
    );
    queryClient.removeQueries({ queryKey: ["messages", p.conversation_id] });
  };

  const onMemberAdded = (p: MemberPayload) => {
    // Refetch the group detail so member list is fresh
    void queryClient.invalidateQueries({ queryKey: ["group", p.group_id] });
    // If this conversation is new to the current user, refresh the list
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const onMemberRemoved = (p: MemberPayload) => {
    void queryClient.invalidateQueries({ queryKey: ["group", p.group_id] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // ── Register ─────────────────────────────────────────────────────────────
  socket.on("new_message", onNewMessage);
  socket.on("message_edited", onMessageEdited);
  socket.on("message_deleted", onMessageDeleted);
  socket.on("reaction_updated", onReactionUpdated);
  socket.on("typing", onTyping);
  socket.on("stop_typing", onStopTyping);
  socket.on("user_online", onUserOnline);
  socket.on("user_offline", onUserOffline);
  socket.on("message_status_update", onMessageStatusUpdate);
  socket.on("conversation_read", onConversationRead);
  socket.on("group_updated", onGroupUpdated);
  socket.on("group_deleted", onGroupDeleted);
  socket.on("member_added", onMemberAdded);
  socket.on("member_removed", onMemberRemoved);

  return () => {
    socket.off("new_message", onNewMessage);
    socket.off("message_edited", onMessageEdited);
    socket.off("message_deleted", onMessageDeleted);
    socket.off("reaction_updated", onReactionUpdated);
    socket.off("typing", onTyping);
    socket.off("stop_typing", onStopTyping);
    socket.off("user_online", onUserOnline);
    socket.off("user_offline", onUserOffline);
    socket.off("message_status_update", onMessageStatusUpdate);
    socket.off("conversation_read", onConversationRead);
    socket.off("group_updated", onGroupUpdated);
    socket.off("group_deleted", onGroupDeleted);
    socket.off("member_added", onMemberAdded);
    socket.off("member_removed", onMemberRemoved);
  };
}
