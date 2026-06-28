"use client";

import { useRouter } from "next/navigation";
import type { Conversation } from "@/types/models";
import { Avatar } from "@/components/common/Avatar";
import { IconButton } from "@/components/ui/icon-button";
import { OnlineDot } from "@/components/common/OnlineDot";
import { ArrowLeft, Video, Phone, Search, MoreVertical } from "lucide-react";
import { parseUtc } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { usePresenceStore } from "@/store/presenceStore";

interface ConversationHeaderProps {
  conversation: Conversation;
  onInfoClick?: () => void;
}

export function ConversationHeader({
  conversation,
  onInfoClick,
}: ConversationHeaderProps) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const isOnlineFn = usePresenceStore((s) => s.isOnline);
  const lastSeenMap = usePresenceStore((s) => s.lastSeen);

  const isDirect = conversation.type === "direct";
  const other = isDirect
    ? conversation.participants.find((p) => p.id !== userId)
    : null;

  const displayName = isDirect
    ? (other?.display_name ?? "Unknown")
    : (conversation.group?.name ?? "Group");

  const avatarSrc = isDirect ? other?.avatar_url : conversation.group?.avatar_url;
  const avatarId = isDirect ? (other?.id ?? "") : (conversation.group?.id ?? "");

  // Resolve online status from presence store (real-time)
  const isOnline = isDirect
    ? (isOnlineFn(other?.id ?? "") ?? other?.is_online ?? false)
    : false;
  const lastSeen = isDirect
    ? (lastSeenMap[other?.id ?? ""] ?? other?.last_seen ?? null)
    : null;

  const memberCount = !isDirect ? conversation.participants.length : null;

  let statusText = "";
  if (isDirect) {
    if (isOnline) {
      statusText = "Online";
    } else if (lastSeen) {
      const date = parseUtc(lastSeen);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMin < 1) statusText = "Last seen just now";
      else if (diffMin < 60) statusText = `Last seen ${diffMin}m ago`;
      else statusText = `Last seen ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  } else if (memberCount !== null) {
    statusText = `${memberCount} member${memberCount !== 1 ? "s" : ""}`;
  }

  return (
    <div
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: 64,
        backgroundColor: "var(--color-bg-app)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Back button (always useful for mobile; harmless on desktop) */}
      <IconButton
        aria-label="Back"
        size="sm"
        onClick={() => router.push("/")}
        className="md:hidden"
      >
        <ArrowLeft size={20} />
      </IconButton>

      {/* Avatar with online indicator */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={avatarSrc} name={displayName} userId={avatarId} size="lg" />
        {isDirect && isOnline && (
          <OnlineDot />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0 flex flex-col">
        <span
          className="text-header-name truncate"
          style={{ color: "var(--color-text-header)" }}
        >
          {displayName}
        </span>
        {statusText && (
          <span
            className="text-header-sub truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {statusText}
          </span>
        )}
      </div>

      {/* Right-side action icons */}
      <IconButton aria-label="Video call" size="md" className="hidden md:inline-flex" onClick={() => router.push("/calls")}>
        <Video size={19} />
      </IconButton>
      <IconButton aria-label="Voice call" size="md" onClick={() => router.push("/calls")}>
        <Phone size={18} />
      </IconButton>
      <IconButton aria-label="Search messages" size="md" className="hidden md:inline-flex">
        <Search size={18} />
      </IconButton>
      <IconButton
        aria-label={onInfoClick ? "Group info" : "More options"}
        size="md"
        onClick={onInfoClick}
      >
        <MoreVertical size={18} />
      </IconButton>
    </div>
  );
}
