"use client";

import { usePresenceStore } from "@/store/presenceStore";

/**
 * Returns whether a given user is currently online.
 *
 * Reads from the presence store, which is kept up to date by the
 * socket `user_online` / `user_offline` event handlers.
 */
export function useOnlineStatus(userId: string | null | undefined): boolean {
  return usePresenceStore((s) =>
    userId != null ? s.onlineUsers.has(userId) : false,
  );
}
