"use client";

import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/services/api/conversations";

export function useConversationList() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => conversationsApi.list({ limit: 100 }),
    select: (data) => data.conversations,
  });
}
