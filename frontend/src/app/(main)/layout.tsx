"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/hooks/useSocket";
import { Avatar } from "@/components/common/Avatar";
import { IconButton } from "@/components/ui/icon-button";
import { ConversationList } from "@/features/conversations/components/ConversationList";
import { ConversationSearch } from "@/features/conversations/components/ConversationSearch";
import { NewConversationModal } from "@/features/conversations/components/NewConversationModal";
import { Edit3, MoreHorizontal, MessageSquare, Phone, Bookmark, Settings, LogOut } from "lucide-react";

interface NavRailItemProps {
  icon: React.FC<{ size?: number }>;
  active?: boolean;
  label: string;
  onClick?: () => void;
}

function NavRailItem({ icon: Icon, active, label, onClick }: NavRailItemProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      title={label}
      style={{
        width: 42,
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        backgroundColor: active ? "rgba(255,255,255,0.13)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.45)",
        transition: "background-color 150ms, color 150ms",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "rgba(255,255,255,0.7)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.45)";
        }
      }}
    >
      <Icon size={22} />
    </button>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  useSocket();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleLogout() {
    import("@/services/api/auth").then((m) => m.authApi.logout().catch(() => {}));
    clearAuth();
    router.replace("/login");
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-app)" }}
    >
      {/* Left nav rail */}
      <nav
        className="shrink-0 flex flex-col items-center py-3 gap-1"
        style={{
          width: 58,
          backgroundColor: "var(--color-bg-nav-strip)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <Avatar
            src={user?.avatar_url}
            name={user?.display_name ?? "Me"}
            userId={user?.id ?? ""}
            size="sm"
          />
        </div>

        <NavRailItem icon={MessageSquare} active label="Chats" onClick={() => router.push("/conversations")} />
        <NavRailItem icon={Phone} label="Calls" />
        <NavRailItem icon={Bookmark} label="Saved" />

        <div style={{ flex: 1 }} />

        <NavRailItem icon={Settings} label="Settings" onClick={() => router.push("/settings")} />
        <NavRailItem icon={LogOut} label="Log out" onClick={handleLogout} />
      </nav>

      {/* Sidebar */}
      <aside
        className="shrink-0 flex flex-col border-r"
        style={{
          width: 300,
          backgroundColor: "var(--color-bg-sidebar)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 border-b shrink-0"
          style={{ height: 64, borderColor: "var(--color-border)" }}
        >
          <span
            style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", flex: 1 }}
          >
            Chats
          </span>
          <IconButton
            aria-label="New conversation"
            size="md"
            onClick={() => setNewConvOpen(true)}
          >
            <Edit3 size={18} />
          </IconButton>
          <IconButton aria-label="More options" size="md">
            <MoreHorizontal size={18} />
          </IconButton>
        </div>

        <div className="px-3 py-2 shrink-0">
          <ConversationSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList searchQuery={searchQuery} />
        </div>
      </aside>

      <main
        className="flex-1 min-w-0 flex flex-col"
        style={{ backgroundColor: "var(--color-bg-app)" }}
      >
        {children}
      </main>

      <NewConversationModal open={newConvOpen} onClose={() => setNewConvOpen(false)} />
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return null;

  return <AppShell>{children}</AppShell>;
}
