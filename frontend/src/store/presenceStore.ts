import { create } from "zustand";

interface PresenceState {
  /** Set of user IDs currently online */
  onlineUsers: Set<string>;
  /** Last-seen timestamps per user (only populated after they go offline) */
  lastSeen: Record<string, string | null>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string, lastSeen: string | null) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  onlineUsers: new Set<string>(),
  lastSeen: {},

  setOnline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  setOffline: (userId, lastSeen) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return {
        onlineUsers: next,
        lastSeen: { ...s.lastSeen, [userId]: lastSeen },
      };
    }),

  isOnline: (userId) => get().onlineUsers.has(userId),
}));
