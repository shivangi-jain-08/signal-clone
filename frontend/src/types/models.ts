export interface User {
  id: string;
  phone_number: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  is_online: boolean;
  last_seen: string | null;
}

export interface Contact {
  id: string;
  contact_user: UserPublic;
  nickname: string | null;
  created_at: string;
}

export type ConversationType = "direct" | "group";

export interface GroupInfo {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  created_by: string;
}

export interface MessagePreview {
  id: string;
  content: string;
  message_type: MessageType;
  sender_id: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  last_message: MessagePreview | null;
  unread_count: number;
  is_archived: boolean;
  participants: UserPublic[];
  group: GroupInfo | null;
  updated_at: string;
}

export type MessageType = "text" | "image" | "file" | "system";
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface ReactionSummary {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface ReplyPreview {
  id: string;
  content: string;
  sender_id: string;
  deleted_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: UserPublic;
  content: string;
  message_type: MessageType;
  reply_to: ReplyPreview | null;
  deleted_at: string | null;
  edited_at: string | null;
  reactions: ReactionSummary[];
  status: MessageStatus | null;
  created_at: string;
  updated_at: string;
  client_id?: string;
}

export interface GroupMember extends UserPublic {
  is_admin: boolean;
  joined_at: string;
  last_read_at: string | null;
}

export interface GroupDetail {
  id: string;
  conversation_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  created_by: string;
  participants: GroupMember[];
  last_message: MessagePreview | null;
  unread_count: number;
  is_archived: boolean;
  updated_at: string;
  created_at: string;
}
