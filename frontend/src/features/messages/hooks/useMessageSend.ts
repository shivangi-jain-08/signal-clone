"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { messagesApi, type SendMessagePayload, type MessageList } from "@/services/api/messages";
import { useAuthStore } from "@/store/authStore";
import type { Message, MessageType } from "@/types/models";

export function useMessageSend(conversationId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const addOptimistic = useCallback(
    (msg: Message) => {
      qc.setQueryData<InfiniteData<MessageList>>(
        ["messages", conversationId],
        (old) => {
          if (!old) {
            return {
              pages: [{ messages: [msg], has_more: false, next_cursor: null }],
              pageParams: [undefined],
            };
          }
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              { ...first!, messages: [msg, ...(first?.messages ?? [])] },
              ...rest,
            ],
          };
        },
      );
    },
    [conversationId, qc],
  );

  const removeOptimistic = useCallback(
    (clientId: string) => {
      qc.setQueryData<InfiniteData<MessageList>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter(
                (m: Message) => m.client_id !== clientId,
              ),
            })),
          };
        },
      );
    },
    [conversationId, qc],
  );

  const replaceOptimistic = useCallback(
    (clientId: string, confirmed: Message) => {
      qc.setQueryData<InfiniteData<MessageList>>(
        ["messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m: Message) =>
                m.client_id === clientId ? confirmed : m,
              ),
            })),
          };
        },
      );
    },
    [conversationId, qc],
  );

  const mutation = useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      messagesApi.send(conversationId, payload),

    onMutate: async (payload) => {
      const clientId = payload.client_id ?? crypto.randomUUID();
      const optimistic: Message = {
        id: `optimistic-${clientId}`,
        conversation_id: conversationId,
        sender: {
          id: user?.id ?? "",
          username: user?.username ?? "",
          display_name: user?.display_name ?? "Me",
          avatar_url: user?.avatar_url ?? null,
          bio: "",
          is_online: true,
          last_seen: null,
        },
        content: payload.content,
        message_type: payload.message_type ?? "text",
        reply_to: null,
        deleted_at: null,
        edited_at: null,
        reactions: [],
        status: "sending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: clientId,
      };
      addOptimistic(optimistic);
      return { clientId };
    },

    onSuccess: (confirmed, _payload, context) => {
      if (context?.clientId) {
        replaceOptimistic(context.clientId, { ...confirmed, client_id: context.clientId });
      }
    },

    onError: (_err, _payload, context) => {
      if (context?.clientId) {
        // Mark as failed
        qc.setQueryData<InfiniteData<MessageList>>(
          ["messages", conversationId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m: Message) =>
                  m.client_id === context.clientId
                    ? { ...m, status: "failed" as const }
                    : m,
                ),
              })),
            };
          },
        );
      }
    },
  });

  const send = useCallback(
    (content: string, opts?: { replyToId?: string; messageType?: MessageType }) => {
      const clientId = crypto.randomUUID();
      mutation.mutate({
        content,
        message_type: opts?.messageType ?? "text",
        reply_to_id: opts?.replyToId ?? null,
        client_id: clientId,
      });
    },
    [mutation],
  );

  return { send, isPending: mutation.isPending, removeOptimistic };
}
