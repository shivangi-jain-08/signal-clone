import { apiClient } from "./client";
import type { Contact } from "@/types/models";

export interface ContactList {
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
}

export interface AddContactPayload {
  contact_user_id: string;
  nickname?: string | null;
}

export const contactsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    apiClient
      .get<{ data: ContactList }>("/contacts", { params })
      .then((r) => r.data.data),

  add: (payload: AddContactPayload) =>
    apiClient
      .post<{ data: Contact }>("/contacts", payload)
      .then((r) => r.data.data),

  update: (contactId: string, nickname: string | null) =>
    apiClient
      .patch<{ data: Contact }>(`/contacts/${contactId}`, { nickname })
      .then((r) => r.data.data),

  remove: (contactId: string) => apiClient.delete(`/contacts/${contactId}`),
};
