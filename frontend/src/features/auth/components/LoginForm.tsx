"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEMO_ACCOUNTS = [
  { label: "Alice", phone: "+919810000001", initials: "AL", color: "#E57373" },
  { label: "Bob",   phone: "+919810000002", initials: "BO", color: "#4DB6AC" },
  { label: "Carol", phone: "+919810000003", initials: "CA", color: "#7986CB" },
  { label: "Dave",  phone: "+919810000004", initials: "DA", color: "#FF8A65" },
];

interface LoginFormProps {
  phone: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onDemoLogin: (phone: string) => void;
  loading: boolean;
}

export function LoginForm({ phone, onChange, onSubmit, onDemoLogin, loading }: LoginFormProps) {
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
          {loading ? "Signing in…" : "Continue"}
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

      {/* Demo accounts */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-timestamp" style={{ color: "var(--color-text-tertiary)" }}>
            demo accounts
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.phone}
              type="button"
              disabled={loading}
              onClick={() => onDemoLogin(a.phone)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors disabled:opacity-50"
              style={{
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-input)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-item-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-input)";
              }}
            >
              <span
                className="flex items-center justify-center rounded-full shrink-0 text-white font-semibold"
                style={{ width: 28, height: 28, fontSize: 10, backgroundColor: a.color }}
              >
                {a.initials}
              </span>
              <div className="min-w-0">
                <p className="text-btn truncate" style={{ color: "var(--color-text-primary)" }}>
                  {a.label}
                </p>
                <p className="text-timestamp truncate" style={{ color: "var(--color-text-tertiary)" }}>
                  {a.phone}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
