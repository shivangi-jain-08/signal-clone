"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OTPFormProps {
  phone: string;
  onSubmit: (otp: string) => void;
  onBack: () => void;
  onResend: () => void;
  loading: boolean;
}

export function OTPForm({ phone, onSubmit, onBack, onResend, loading }: OTPFormProps) {
  const [otp, setOtp] = useState("");

  return (
    <div
      className="rounded-2xl p-8 w-full"
      style={{ backgroundColor: "var(--color-bg-modal)", boxShadow: "var(--shadow-modal)" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(otp);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <span style={{ fontSize: 40 }}>📱</span>
          <h1 className="text-modal-title" style={{ color: "var(--color-text-primary)" }}>
            Enter OTP
          </h1>
          <p className="text-msg-content text-center" style={{ color: "var(--color-text-secondary)" }}>
            Code sent to {phone}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            className="text-center text-xl tracking-[0.4em] font-mono"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus
            autoComplete="one-time-code"
          />
          <p className="text-timestamp text-center" style={{ color: "var(--color-text-tertiary)" }}>
            Hint: it&apos;s always 123456 (mocked)
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={otp.length !== 6 || loading}
        >
          {loading ? "Verifying…" : "Verify"}
        </Button>

        <div className="flex justify-between items-center">
          <button
            type="button"
            className="text-msg-preview hover:underline"
            style={{ color: "var(--color-text-tertiary)" }}
            onClick={onBack}
          >
            ← Change number
          </button>
          <button
            type="button"
            className="text-msg-preview hover:underline"
            style={{ color: "var(--color-accent)" }}
            onClick={onResend}
          >
            Resend OTP
          </button>
        </div>
      </form>
    </div>
  );
}
