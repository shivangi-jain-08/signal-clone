import { create } from "zustand";

interface TypingState {
  /** convId → Set of display names currently typing */
  typing: Record<string, string[]>;
  setTyping: (convId: string, userId: string, username: string) => void;
  clearTyping: (convId: string, userId: string) => void;
}

export const useTypingStore = create<TypingState>()((set) => ({
  typing: {},

  setTyping: (convId, userId, username) =>
    set((s) => {
      const existing = s.typing[convId] ?? [];
      // Replace or add (keyed by userId via index trick — store as "userId:name")
      const filtered = existing.filter((u) => !u.startsWith(userId + ":"));
      return {
        typing: {
          ...s.typing,
          [convId]: [...filtered, `${userId}:${username}`],
        },
      };
    }),

  clearTyping: (convId, userId) =>
    set((s) => {
      const existing = s.typing[convId] ?? [];
      return {
        typing: {
          ...s.typing,
          [convId]: existing.filter((u) => !u.startsWith(userId + ":")),
        },
      };
    }),
}));

/** Extract display names from raw "userId:name" entries */
export function getTypingNames(convId: string): string[] {
  return (useTypingStore.getState().typing[convId] ?? []).map(
    (u) => u.split(":").slice(1).join(":") || u,
  );
}
