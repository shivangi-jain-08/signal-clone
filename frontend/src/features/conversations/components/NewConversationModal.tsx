"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { usersApi } from "@/services/api/users";
import { conversationsApi } from "@/services/api/conversations";
import { groupsApi } from "@/services/api/groups";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/components/ui/toast";
import type { UserPublic } from "@/types/models";

type Tab = "chat" | "group";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewConversationModal({ open, onClose }: NewConversationModalProps) {
  const [tab, setTab] = useState<Tab>("chat");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { data: results, isFetching } = useQuery({
    queryKey: ["user-search-new-conv", search],
    queryFn: () => usersApi.search(search),
    enabled: search.trim().length > 0,
    staleTime: 15_000,
  });

  function handleClose() {
    setSearch("");
    setGroupName("");
    setSelected([]);
    setTab("chat");
    onClose();
  }

  async function handleStartChat(user: UserPublic) {
    setLoading(true);
    try {
      const conv = await conversationsApi.createDirect(user.id);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push("/conversations/" + conv.id);
      handleClose();
    } catch {
      toast.error("Failed to start conversation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      const group = await groupsApi.create({
        name: groupName.trim(),
        member_ids: selected.map((u) => u.id),
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push("/conversations/" + group.conversation_id);
      handleClose();
    } catch {
      toast.error("Failed to create group.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(user: UserPublic) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title={tab === "chat" ? "New Chat" : "New Group"}
      maxWidth={480}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-0 rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {(["chat", "group"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setSearch("");
                setSelected([]);
              }}
              className="flex-1 py-2 text-btn transition-colors"
              style={{
                backgroundColor: tab === t ? "var(--color-accent)" : "transparent",
                color: tab === t ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {t === "chat" ? "New Chat" : "New Group"}
            </button>
          ))}
        </div>

        {tab === "group" && selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-msg-preview"
                style={{
                  backgroundColor: "var(--color-bg-input)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {u.display_name}
                <button
                  type="button"
                  onClick={() => toggleSelect(u)}
                  aria-label={`Remove ${u.display_name}`}
                >
                  <X size={12} style={{ color: "var(--color-text-tertiary)" }} />
                </button>
              </span>
            ))}
          </div>
        )}

        {tab === "group" && (
          <Input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        )}

        <Input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {isFetching && (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        )}

        {!isFetching && results && results.length === 0 && search.trim().length > 0 && (
          <p
            className="text-msg-preview text-center py-2"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            No users found
          </p>
        )}

        {!isFetching && results && results.length > 0 && (
          <div className="flex flex-col max-h-56 overflow-y-auto">
            {results.map((user) => {
              const isSelected = selected.some((u) => u.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => tab === "chat" ? handleStartChat(user) : toggleSelect(user)}
                  disabled={loading}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left"
                  style={{
                    backgroundColor: isSelected ? "var(--color-bg-item-active)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-item-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name}
                    userId={user.id}
                    size="md"
                    isOnline={user.is_online}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-conv-name truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {user.display_name}
                    </p>
                    <p
                      className="text-msg-preview truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      @{user.username}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "group" && (
          <Button
            className="w-full"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selected.length === 0 || loading}
          >
            {loading ? "Creating…" : "Create Group"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
