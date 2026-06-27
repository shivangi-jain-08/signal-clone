import { create } from "zustand";

interface ConversationState {
  activeConversationId: string | null;
  /** Per-conversation draft message text */
  drafts: Record<string, string>;
  /** Per-conversation reply-to message ID */
  replyToIds: Record<string, string | null>;
  setActiveConversation: (id: string | null) => void;
  setDraft: (conversationId: string, text: string) => void;
  setReplyTo: (conversationId: string, messageId: string | null) => void;
}

export const useConversationStore = create<ConversationState>()((set) => ({
  activeConversationId: null,
  drafts: {},
  replyToIds: {},
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setDraft: (conversationId, text) =>
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: text } })),
  setReplyTo: (conversationId, messageId) =>
    set((state) => ({ replyToIds: { ...state.replyToIds, [conversationId]: messageId } })),
}));
