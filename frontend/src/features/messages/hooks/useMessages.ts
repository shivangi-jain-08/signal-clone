"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { messagesApi } from "@/services/api/messages";
import type { MessageList } from "@/services/api/messages";

export function useMessages(conversationId: string) {
  return useInfiniteQuery<MessageList>({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      messagesApi.list(conversationId, {
        before: pageParam as string | undefined,
        limit: 40,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}
