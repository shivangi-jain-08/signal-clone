import { apiClient } from "./client";
import type { GroupDetail } from "@/types/models";

export interface CreateGroupPayload {
  name: string;
  description?: string;
  avatar_url?: string | null;
  member_ids?: string[];
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  avatar_url?: string | null;
}

export const groupsApi = {
  create: (payload: CreateGroupPayload) =>
    apiClient
      .post<{ data: GroupDetail }>("/groups", payload)
      .then((r) => r.data.data),

  get: (groupId: string) =>
    apiClient
      .get<{ data: GroupDetail }>(`/groups/${groupId}`)
      .then((r) => r.data.data),

  update: (groupId: string, payload: UpdateGroupPayload) =>
    apiClient
      .patch<{ data: GroupDetail }>(`/groups/${groupId}`, payload)
      .then((r) => r.data.data),

  delete: (groupId: string) => apiClient.delete(`/groups/${groupId}`),

  addMembers: (groupId: string, user_ids: string[]) =>
    apiClient
      .post<{ data: GroupDetail }>(`/groups/${groupId}/members`, { user_ids })
      .then((r) => r.data.data),

  removeMember: (groupId: string, userId: string) =>
    apiClient.delete(`/groups/${groupId}/members/${userId}`),
};
