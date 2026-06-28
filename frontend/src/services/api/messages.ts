import { apiClient } from "./client";
import type { Message, MessageType, ReactionSummary, ReplyPreview } from "@/types/models";

/** Raw reaction entry from the backend (not aggregated). */
interface RawReaction {
  emoji: string;
  user_id: string;
}

/** Raw message shape the backend returns (reactions are flat pairs). */
interface RawMessage {
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

interface RawMessageList {
  messages: RawMessage[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface MessageList {
  messages: Message[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface SendMessagePayload {
  content: string;
  message_type?: MessageType;
  reply_to_id?: string | null;
  client_id?: string;
}

/** Aggregate flat `{emoji, user_id}` pairs into `{emoji, count, user_ids}` summaries. */
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

function normalise(raw: RawMessage): Message {
  return {
    ...raw,
    reactions: groupReactions(raw.reactions),
    status: null,
  };
}

function normaliseList(raw: RawMessageList): MessageList {
  return {
    ...raw,
    messages: raw.messages.map(normalise),
  };
}

export const messagesApi = {
  list: (
    conversationId: string,
    params?: { before?: string; after?: string; limit?: number },
  ) =>
    apiClient
      .get<{ data: RawMessageList }>(
        `/conversations/${conversationId}/messages`,
        { params },
      )
      .then((r) => normaliseList(r.data.data)),

  send: (conversationId: string, payload: SendMessagePayload) =>
    apiClient
      .post<{ data: RawMessage }>(
        `/conversations/${conversationId}/messages`,
        payload,
      )
      .then((r) => normalise(r.data.data)),

  edit: (messageId: string, content: string) =>
    apiClient
      .patch<{ data: RawMessage }>(`/messages/${messageId}`, { content })
      .then((r) => normalise(r.data.data)),

  delete: (messageId: string) =>
    apiClient
      .delete<{ data: { id: string; deleted_at: string } }>(
        `/messages/${messageId}`,
      )
      .then((r) => r.data.data),

  react: (messageId: string, emoji: string) =>
    apiClient
      .put<{ data: { message_id: string; reactions: RawReaction[] } }>(
        `/messages/${messageId}/reactions`,
        { emoji },
      )
      .then((r) => ({
        message_id: r.data.data.message_id,
        reactions: groupReactions(r.data.data.reactions),
      })),
};
