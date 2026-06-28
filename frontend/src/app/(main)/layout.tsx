"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/hooks/useSocket";

function AppShell({ children }: { children: React.ReactNode }) {
  useSocket();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-app)" }}
    >
      {/* Nav strip — narrow icon rail on the left */}
      <nav
        className="w-14 shrink-0 flex flex-col border-r"
        style={{
          backgroundColor: "var(--color-bg-nav-strip)",
          borderColor: "var(--color-border)",
        }}
      />

      {/* Sidebar — conversation list panel */}
      <aside
        className="w-80 shrink-0 flex flex-col border-r"
        style={{
          backgroundColor: "var(--color-bg-sidebar)",
          borderColor: "var(--color-border)",
        }}
      />

      {/* Main pane — chat thread or empty state */}
      <main
        className="flex-1 min-w-0 flex flex-col"
        style={{ backgroundColor: "var(--color-bg-app)" }}
      >
        {children}
      </main>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  // Wait for zustand to rehydrate from localStorage before checking auth
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
