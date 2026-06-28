"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Smartphone } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { ProfileSettings } from "@/features/settings/components/ProfileSettings";
import { PrivacySettings } from "@/features/settings/components/PrivacySettings";
import { NotificationSettings } from "@/features/settings/components/NotificationSettings";
import type { Theme } from "@/store/uiStore";

type Section = "profile" | "appearance" | "privacy" | "notifications" | "linked-devices" | "encryption";

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
  { id: "linked-devices", label: "Linked Devices" },
  { id: "encryption", label: "Encryption" },
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

function ComingSoonSection({ icon: Icon, title, description }: { icon: React.FC<{ size?: number }>, title: string, description: string }) {
  return (
    <div className="p-6 flex flex-col gap-4 max-w-md">
      <h2 className="text-header-name" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h2>
      <div
        className="flex flex-col items-center gap-4 rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--color-bg-input)", border: "1px solid var(--color-border)" }}
      >
        <div style={{ color: "var(--color-text-tertiary)" }}>
          <Icon size={40} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-btn" style={{ color: "var(--color-text-primary)" }}>
            Coming Soon
          </p>
          <p className="text-msg-preview" style={{ color: "var(--color-text-secondary)" }}>
            {description}
          </p>
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
      className="flex flex-col md:flex-row h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-app)" }}
    >
      {/* Mobile-only top bar */}
      <div
        className="flex md:hidden items-center gap-3 px-4 shrink-0 border-b"
        style={{ height: 56, backgroundColor: "var(--color-bg-sidebar)", borderColor: "var(--color-border)" }}
      >
        <button
          type="button"
          onClick={() => router.push("/conversations")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", padding: 4, display: "flex" }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-header-name" style={{ color: "var(--color-text-primary)" }}>Settings</span>
      </div>

      {/* Nav — vertical sidebar on desktop, horizontal scrollable tabs on mobile */}
      <nav
        className="shrink-0 flex flex-row md:flex-col border-b md:border-b-0 md:border-r w-full md:w-[220px] overflow-x-auto md:overflow-x-visible md:py-4"
        style={{ backgroundColor: "var(--color-bg-sidebar)", borderColor: "var(--color-border)" }}
      >
        {/* Desktop-only: back link + section label */}
        <button
          type="button"
          onClick={() => router.push("/conversations")}
          className="hidden md:flex items-center gap-2 px-4 pb-3 text-msg-preview hover:underline"
          style={{ color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <p
          className="hidden md:block text-settings-label px-4 pb-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          SETTINGS
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className="shrink-0 whitespace-nowrap text-btn transition-colors px-4 py-3 md:py-2.5 text-left"
            style={{
              backgroundColor: section === item.id ? "var(--color-bg-item-active)" : "transparent",
              color: section === item.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: `2px solid ${section === item.id ? "var(--color-accent)" : "transparent"}`,
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
        {section === "linked-devices" && (
          <ComingSoonSection
            icon={Smartphone}
            title="Linked Devices"
            description="Link Signal Clone on other devices — desktop, tablet, and web — so your messages stay in sync everywhere."
          />
        )}
        {section === "encryption" && (
          <ComingSoonSection
            icon={Lock}
            title="End-to-End Encryption"
            description="All messages are end-to-end encrypted in transit using TLS. Full Signal Protocol key exchange and sealed sender are on the roadmap."
          />
        )}
      </main>
    </div>
  );
}
