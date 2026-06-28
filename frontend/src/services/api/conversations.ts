import { apiClient } from "./client";
import type { Conversation, UserPublic } from "@/types/models";

export interface ConversationList {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConversationDetail extends Conversation {
  participants: (UserPublic & {
    is_admin: boolean;
    joined_at: string;
    last_read_at: string | null;
  })[];
}

export interface ConversationSearchResult extends Conversation {
  match_context: string | null;
}

export const conversationsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    apiClient
      .get<{ data: ConversationList }>("/conversations", { params })
      .then((r) => r.data.data),

  search: (q: string) =>
    apiClient
      .get<{ data: ConversationSearchResult[] }>("/conversations/search", {
        params: { q },
      })
      .then((r) => r.data.data),

  get: (id: string) =>
    apiClient
      .get<{ data: ConversationDetail }>(`/conversations/${id}`)
      .then((r) => r.data.data),

  createDirect: (target_user_id: string) =>
    apiClient
      .post<{ data: Conversation }>("/conversations/direct", { target_user_id })
      .then((r) => r.data.data),

  markRead: (id: string) =>
    apiClient
      .post<{ data: { last_read_at: string } }>(`/conversations/${id}/read`)
      .then((r) => r.data.data),

  archive: (id: string, is_archived: boolean) =>
    apiClient
      .patch<{ data: Conversation }>(`/conversations/${id}/archive`, {
        is_archived,
      })
      .then((r) => r.data.data),
};
