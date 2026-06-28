"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  phone: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function LoginForm({ phone, onChange, onSubmit, loading }: LoginFormProps) {
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
          <span style={{ fontSize: 40 }}>🔒</span>
          <h1 className="text-modal-title" style={{ color: "var(--color-text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-msg-content text-center" style={{ color: "var(--color-text-secondary)" }}>
            Enter your phone number to sign in
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="phone"
            className="text-settings-label"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Phone number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+91 98100 00001"
            value={phone}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            autoComplete="tel"
          />
          <p className="text-timestamp" style={{ color: "var(--color-text-tertiary)" }}>
            Include country code (e.g. +91)
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!phone.trim() || loading}
        >
          {loading ? "Sending…" : "Continue"}
        </Button>

        <p className="text-msg-preview text-center" style={{ color: "var(--color-text-tertiary)" }}>
          New here?{" "}
          <Link
            href="/register"
            style={{ color: "var(--color-accent)" }}
            className="hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
