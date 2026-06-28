"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/services/api/users";
import { Avatar } from "@/components/common/Avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await usersApi.updateMe({ display_name: displayName, username, bio });
      updateUser(updated);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error((err as any)?.response?.data?.detail ?? "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-md">
      <h2 className="text-header-name" style={{ color: "var(--color-text-primary)" }}>
        Profile
      </h2>

      <div className="flex justify-center">
        <Avatar
          src={user?.avatar_url}
          name={user?.display_name ?? "Me"}
          userId={user?.id ?? ""}
          size="2xl"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-name"
            className="text-settings-label"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Display name
          </label>
          <Input
            id="profile-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-username"
            className="text-settings-label"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Username
          </label>
          <Input
            id="profile-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-bio"
            className="text-settings-label"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Bio
          </label>
          <Input
            id="profile-bio"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="About me"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
