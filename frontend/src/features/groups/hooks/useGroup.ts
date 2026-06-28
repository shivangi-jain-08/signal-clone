"use client";

import { useQuery } from "@tanstack/react-query";
import { groupsApi } from "@/services/api/groups";

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupsApi.get(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}
