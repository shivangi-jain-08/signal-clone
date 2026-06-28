"use client";

import { useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import type { GroupMember } from "@/types/models";
import { groupsApi } from "@/services/api/groups";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2 } from "lucide-react";

interface GroupMemberListProps {
  members: GroupMember[];
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function GroupMemberList({
  members,
  groupId,
  currentUserId,
  isAdmin,
}: GroupMemberListProps) {
  const qc = useQueryClient();
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(userId: string) {
    if (removing) return;
    setRemoving(userId);
    try {
      await groupsApi.removeMember(groupId, userId);
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col">
      {members.map((member) => {
        const isSelf = member.id === currentUserId;
        return (
          <div
            key={member.id}
            className="flex items-center gap-3 px-4 py-2"
            style={{ minHeight: 52 }}
          >
            <Avatar
              src={member.avatar_url}
              name={member.display_name}
              userId={member.id}
              size="base"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-settings-item truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {member.display_name}
                  {isSelf && (
                    <span style={{ color: "var(--color-text-tertiary)" }}>
                      {" "}(You)
                    </span>
                  )}
                </span>
                {member.is_admin && (
                  <ShieldCheck
                    size={13}
                    style={{ color: "var(--color-accent)", flexShrink: 0 }}
                    aria-label="Admin"
                  />
                )}
              </div>
              <span
                className="text-msg-preview"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                @{member.username}
              </span>
            </div>

            {isAdmin && !isSelf && (
              <button
                type="button"
                title="Remove member"
                onClick={() => handleRemove(member.id)}
                disabled={removing === member.id}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-error)",
                  opacity: removing === member.id ? 0.5 : 1,
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
