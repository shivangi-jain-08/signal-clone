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
import { Edit3, Settings, LogOut } from "lucide-react";

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
      <aside
        className="shrink-0 flex flex-col border-r"
        style={{
          width: 360,
          backgroundColor: "var(--color-bg-sidebar)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 border-b shrink-0"
          style={{ height: 64, borderColor: "var(--color-border)" }}
        >
          <Avatar
            src={user?.avatar_url}
            name={user?.display_name ?? "Me"}
            userId={user?.id ?? ""}
            size="base"
          />
          <span
            className="text-header-name flex-1 truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            Signal Clone
          </span>
          <IconButton
            aria-label="New conversation"
            size="md"
            onClick={() => setNewConvOpen(true)}
          >
            <Edit3 size={18} />
          </IconButton>
          <IconButton
            aria-label="Settings"
            size="md"
            onClick={() => router.push("/settings")}
          >
            <Settings size={18} />
          </IconButton>
          <IconButton aria-label="Log out" size="md" onClick={handleLogout}>
            <LogOut size={18} />
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
