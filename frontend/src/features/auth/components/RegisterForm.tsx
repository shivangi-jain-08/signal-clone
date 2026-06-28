"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  phone: string;
  displayName: string;
  onPhoneChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function RegisterForm({
  phone,
  displayName,
  onPhoneChange,
  onNameChange,
  onSubmit,
  loading,
}: RegisterFormProps) {
  return (
    <div
      className="rounded-2xl p-8 w-full"
      style={{ backgroundColor: "var(--color-bg-modal)", boxShadow: "var(--shadow-modal)" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <span style={{ fontSize: 40 }}>👤</span>
          <h1 className="text-modal-title" style={{ color: "var(--color-text-primary)" }}>
            Create account
          </h1>
          <p className="text-msg-content text-center" style={{ color: "var(--color-text-secondary)" }}>
            Set up your Signal profile
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="reg-phone"
            className="text-settings-label"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Phone number
          </label>
          <Input
            id="reg-phone"
            type="tel"
            placeholder="+91 98100 00001"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            autoFocus
            autoComplete="tel"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="reg-name"
            className="text-settings-label"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Display name
          </label>
          <Input
            id="reg-name"
            type="text"
            placeholder="Alice"
            value={displayName}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="name"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!phone.trim() || !displayName.trim() || loading}
        >
          {loading ? "Creating…" : "Create account"}
        </Button>

        <p className="text-msg-preview text-center" style={{ color: "var(--color-text-tertiary)" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--color-accent)" }}
            className="hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
