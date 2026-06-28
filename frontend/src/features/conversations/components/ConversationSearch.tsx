"use client";

import { Search, X } from "lucide-react";
import { Spinner } from "@/components/common/Spinner";

interface ConversationSearchProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  isFetching?: boolean;
}

export function ConversationSearch({
  value,
  onChange,
  onClear,
  isFetching,
}: ConversationSearchProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3"
      style={{
        height: 36,
        backgroundColor: "var(--color-bg-input)",
        border: "1px solid var(--color-border)",
      }}
    >
      <Search size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Search or start new chat"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-msg-preview min-w-0"
        style={{ color: "var(--color-text-primary)" }}
      />
      {isFetching && <Spinner size="sm" />}
      {!isFetching && value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="shrink-0"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
