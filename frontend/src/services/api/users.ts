import { apiClient } from "./client";
import type { User, UserPublic } from "@/types/models";

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  username?: string;
  avatar_url?: string | null;
}

export const usersApi = {
  me: () =>
    apiClient.get<{ data: User }>("/users/me").then((r) => r.data.data),

  updateMe: (payload: UpdateProfilePayload) =>
    apiClient
      .patch<{ data: User }>("/users/me", payload)
      .then((r) => r.data.data),

  search: (q: string, limit = 20) =>
    apiClient
      .get<{ data: UserPublic[] }>("/users/search", { params: { q, limit } })
      .then((r) => r.data.data),

  get: (userId: string) =>
    apiClient
      .get<{ data: UserPublic }>(`/users/${userId}`)
      .then((r) => r.data.data),
};
