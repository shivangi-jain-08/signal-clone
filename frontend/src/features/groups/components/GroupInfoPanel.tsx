"use client";

import { Avatar } from "@/components/common/Avatar";
import { GroupMemberList } from "./GroupMemberList";
import { useGroup } from "../hooks/useGroup";
import { useAuthStore } from "@/store/authStore";
import { groupsApi } from "@/services/api/groups";
import { useQueryClient } from "@tanstack/react-query";
import { X, Users, LogOut } from "lucide-react";
import { Spinner } from "@/components/common/Spinner";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

interface GroupInfoPanelProps {
  groupId: string;
  conversationId: string;
  onClose: () => void;
}

export function GroupInfoPanel({
  groupId,
  conversationId,
  onClose,
}: GroupInfoPanelProps) {
  const { data: group, isLoading } = useGroup(groupId);
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const qc = useQueryClient();
  const router = useRouter();

  const isAdmin =
    group?.participants.find((p) => p.id === userId)?.is_admin ?? false;

  async function handleLeave() {
    try {
      await groupsApi.removeMember(groupId, userId);
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
      router.push("/conversations");
    } catch (err) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail ?? "Could not leave group.");
    }
  }

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-sidebar)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{
          height: 64,
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <span
          className="text-header-name"
          style={{ color: "var(--color-text-primary)" }}
        >
          Group Info
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            padding: 4,
            borderRadius: "50%",
          }}
          aria-label="Close panel"
        >
          <X size={20} />
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      )}

      {group && (
        <>
          {/* Group avatar + name */}
          <div
            className="flex flex-col items-center gap-3 py-6 px-4"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <Avatar
              src={group.avatar_url}
              name={group.name}
              userId={group.id}
              size="xl"
            />
            <div className="text-center">
              <p
                className="text-header-name"
                style={{ color: "var(--color-text-primary)" }}
              >
                {group.name}
              </p>
              <p
                className="text-header-sub mt-0.5 flex items-center gap-1 justify-center"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <Users size={13} />
                {group.participants.length} members
              </p>
            </div>
            {group.description && (
              <p
                className="text-msg-preview text-center mt-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {group.description}
              </p>
            )}
          </div>

          {/* Members */}
          <div>
            <p
              className="text-settings-label px-4 py-3"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              MEMBERS
            </p>
            <GroupMemberList
              members={group.participants}
              groupId={groupId}
              currentUserId={userId}
              isAdmin={isAdmin}
            />
          </div>

          {/* Leave group */}
          <div
            className="p-4 mt-auto"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <button
              type="button"
              onClick={handleLeave}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-btn"
              style={{
                color: "var(--color-error)",
                border: "1px solid var(--color-error)",
                background: "none",
                cursor: "pointer",
                transition: "background-color 80ms",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(229,57,53,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <LogOut size={15} />
              Leave Group
            </button>
          </div>
        </>
      )}
    </div>
  );
}
