import { apiClient } from "./client";
import type { Conversation, UserPublic } from "@/types/models";

export interface ConversationList {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConversationParticipant extends UserPublic {
  is_admin: boolean;
  joined_at: string;
  last_read_at: string | null;
}

export interface ConversationDetail extends Conversation {
  participants: ConversationParticipant[];
}

// Backend returns participants nested as { user: UserPublic, is_admin, joined_at, last_read_at }
interface BackendParticipantDetail {
  user: UserPublic;
  is_admin: boolean;
  joined_at: string;
  last_read_at: string | null;
}

interface BackendConversationDetail extends Omit<ConversationDetail, "participants"> {
  participants: BackendParticipantDetail[];
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
      .get<{ data: BackendConversationDetail }>(`/conversations/${id}`)
      .then((r) => {
        const raw = r.data.data;
        return {
          ...raw,
          participants: raw.participants.map((p) => ({
            ...p.user,
            is_admin: p.is_admin,
            joined_at: p.joined_at,
            last_read_at: p.last_read_at,
          })),
        } as ConversationDetail;
      }),

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
