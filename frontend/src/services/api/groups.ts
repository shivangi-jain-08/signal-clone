import { apiClient } from "./client";
import type { GroupDetail, GroupMember } from "@/types/models";

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

interface BackendParticipant {
  user: Omit<GroupMember, "is_admin" | "joined_at" | "last_read_at">;
  is_admin: boolean;
  joined_at: string;
  last_read_at: string | null;
}

interface BackendGroupDetail extends Omit<GroupDetail, "participants"> {
  participants: BackendParticipant[];
}

function normalizeGroup(raw: BackendGroupDetail): GroupDetail {
  return {
    ...raw,
    participants: raw.participants.map((p) => ({
      ...p.user,
      is_admin: p.is_admin,
      joined_at: p.joined_at,
      last_read_at: p.last_read_at,
    })),
  };
}

export const groupsApi = {
  create: (payload: CreateGroupPayload) =>
    apiClient
      .post<{ data: BackendGroupDetail }>("/groups", payload)
      .then((r) => normalizeGroup(r.data.data)),

  get: (groupId: string) =>
    apiClient
      .get<{ data: BackendGroupDetail }>(`/groups/${groupId}`)
      .then((r) => normalizeGroup(r.data.data)),

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
