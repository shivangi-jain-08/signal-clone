"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { ProfileSettings } from "@/features/settings/components/ProfileSettings";
import { PrivacySettings } from "@/features/settings/components/PrivacySettings";
import { NotificationSettings } from "@/features/settings/components/NotificationSettings";
import type { Theme } from "@/store/uiStore";

type Section = "profile" | "appearance" | "privacy" | "notifications";

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

function AppearanceSettings() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-md">
      <h2 className="text-header-name" style={{ color: "var(--color-text-primary)" }}>
        Appearance
      </h2>
      <div className="flex flex-col gap-2">
        <p className="text-settings-label" style={{ color: "var(--color-text-secondary)" }}>
          Theme
        </p>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className="flex-1 py-2 rounded-lg text-btn transition-colors"
              style={{
                backgroundColor:
                  theme === t.value ? "var(--color-accent)" : "var(--color-bg-input)",
                color:
                  theme === t.value ? "#fff" : "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("profile");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-app)" }}
    >
      <nav
        className="shrink-0 flex flex-col border-r py-4"
        style={{
          width: 220,
          backgroundColor: "var(--color-bg-sidebar)",
          borderColor: "var(--color-border)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/conversations")}
          className="flex items-center gap-2 px-4 pb-3 text-msg-preview hover:underline"
          style={{ color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <p
          className="text-settings-label px-4 pb-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          SETTINGS
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className="text-left px-4 py-2.5 text-btn transition-colors"
            style={{
              backgroundColor:
                section === item.id ? "var(--color-bg-item-active)" : "transparent",
              color:
                section === item.id
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ backgroundColor: "var(--color-bg-app)" }}
      >
        {section === "profile" && <ProfileSettings />}
        {section === "appearance" && <AppearanceSettings />}
        {section === "privacy" && <PrivacySettings />}
        {section === "notifications" && <NotificationSettings />}
      </main>
    </div>
  );
}
