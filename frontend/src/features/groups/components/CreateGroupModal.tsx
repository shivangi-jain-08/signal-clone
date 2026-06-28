"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/services/api/users";
import { groupsApi } from "@/services/api/groups";
import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/store/authStore";
import { Search, X, Check } from "lucide-react";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const [step, setStep] = useState<"members" | "name">("members");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["users", "search", search],
    queryFn: () => usersApi.search(search),
    enabled: search.trim().length >= 1,
    staleTime: 10_000,
  });

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreate() {
    if (!groupName.trim() || creating) return;
    setCreating(true);
    try {
      await groupsApi.create({
        name: groupName.trim(),
        description: description.trim() || undefined,
        member_ids: selected,
      });
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      handleClose();
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setStep("members");
    setSearch("");
    setSelected([]);
    setGroupName("");
    setDescription("");
    onClose();
  }

  if (!open) return null;

  const filtered = (users ?? []).filter((u) => u.id !== userId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.64)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          width: 480,
          maxHeight: "80vh",
          backgroundColor: "var(--color-bg-modal)",
          borderRadius: 12,
          boxShadow: "var(--shadow-modal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
        >
          <span
            className="text-modal-title"
            style={{ color: "var(--color-text-primary)" }}
          >
            {step === "members" ? "New Group — Select Members" : "Name Your Group"}
          </span>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {step === "members" ? (
          <>
            {/* Selected chips */}
            {selected.length > 0 && (
              <div
                className="flex flex-wrap gap-1.5 px-4 py-2"
                style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
              >
                {selected.map((id) => {
                  const u = filtered.find((x) => x.id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-badge"
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "#fff",
                      }}
                    >
                      {u?.display_name ?? id}
                      <button
                        type="button"
                        onClick={() => toggleSelect(id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "rgba(255,255,255,0.7)",
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{
                borderBottom: "1px solid var(--color-border)",
                flexShrink: 0,
              }}
            >
              <Search size={15} style={{ color: "var(--color-text-tertiary)" }} />
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "none",
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Results */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.map((u) => {
                const sel = selected.includes(u.id);
                return (
                  <div
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(u.id)}
                    onKeyDown={(e) => e.key === "Enter" && toggleSelect(u.id)}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer"
                    style={{
                      backgroundColor: sel
                        ? "var(--color-bg-item-active)"
                        : "transparent",
                      transition: "background-color 80ms",
                    }}
                    onMouseEnter={(e) => {
                      if (!sel)
                        e.currentTarget.style.backgroundColor =
                          "var(--color-bg-item-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!sel)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Avatar
                      src={u.avatar_url}
                      name={u.display_name}
                      userId={u.id}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-conv-name truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {u.display_name}
                      </p>
                      <p
                        className="text-msg-preview"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        @{u.username}
                      </p>
                    </div>
                    {sel && (
                      <Check
                        size={16}
                        style={{ color: "var(--color-accent)", flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })}
              {search && filtered.length === 0 && (
                <p
                  className="text-center py-8 text-msg-preview"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No users found
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-3 px-5 py-4"
              style={{ borderTop: "1px solid var(--color-border)", flexShrink: 0 }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="text-btn px-4 py-2 rounded-lg"
                style={{
                  background: "none",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("name")}
                disabled={selected.length < 1}
                className="text-btn px-4 py-2 rounded-lg"
                style={{
                  backgroundColor:
                    selected.length >= 1
                      ? "var(--color-accent)"
                      : "var(--color-bg-input)",
                  color: selected.length >= 1 ? "#fff" : "var(--color-text-tertiary)",
                  border: "none",
                  cursor: selected.length >= 1 ? "pointer" : "not-allowed",
                }}
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Name step */}
            <div className="flex flex-col gap-4 px-5 py-5 flex-1">
              <div>
                <label
                  className="text-settings-label"
                  style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}
                >
                  GROUP NAME *
                </label>
                <input
                  type="text"
                  placeholder="Team name…"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                  maxLength={80}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-input)",
                    color: "var(--color-text-primary)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  className="text-settings-label"
                  style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}
                >
                  DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  placeholder="What is this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-input)",
                    color: "var(--color-text-primary)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <p
                className="text-msg-preview"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {selected.length} member{selected.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            <div
              className="flex justify-between gap-3 px-5 py-4"
              style={{ borderTop: "1px solid var(--color-border)", flexShrink: 0 }}
            >
              <button
                type="button"
                onClick={() => setStep("members")}
                className="text-btn px-4 py-2 rounded-lg"
                style={{
                  background: "none",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!groupName.trim() || creating}
                className="text-btn px-4 py-2 rounded-lg"
                style={{
                  backgroundColor:
                    groupName.trim() && !creating
                      ? "var(--color-accent)"
                      : "var(--color-bg-input)",
                  color:
                    groupName.trim() && !creating
                      ? "#fff"
                      : "var(--color-text-tertiary)",
                  border: "none",
                  cursor:
                    groupName.trim() && !creating ? "pointer" : "not-allowed",
                }}
              >
                {creating ? "Creating…" : "Create Group"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
