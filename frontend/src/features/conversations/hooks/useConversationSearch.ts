"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/services/api/conversations";

export function useConversationSearch() {
  const [query, setQuery] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["conv-search", query],
    queryFn: () => conversationsApi.search(query),
    enabled: query.trim().length > 0,
    staleTime: 15_000,
  });

  function clear() {
    setQuery("");
  }

  return {
    query,
    setQuery,
    results: data ?? [],
    isFetching,
    clear,
  };
}
