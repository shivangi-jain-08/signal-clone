import type { Message, MessageStatus } from "./models";

export interface NewMessagePayload {
  message: Message;
  conversation_id: string;
}

export interface MessageStatusPayload {
  message_id: string;
  conversation_id: string;
  user_id: string;
  status: MessageStatus;
}

export interface MessageDeletedPayload {
  message_id: string;
  conversation_id: string;
  deleted_at: string;
}

export interface MessageEditedPayload {
  message_id: string;
  conversation_id: string;
  content: string;
  edited_at: string;
}

export interface TypingPayload {
  conversation_id: string;
  user_id: string;
  username: string;
}

export interface UserPresencePayload {
  user_id: string;
  is_online: boolean;
  last_seen: string | null;
}

export interface ReactionUpdatedPayload {
  message_id: string;
  conversation_id: string;
  emoji: string;
  user_id: string;
  action: "add" | "remove";
}
