"use client";

import { useLoginFlow } from "@/features/auth/hooks/useAuthForm";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { OTPForm } from "@/features/auth/components/OTPForm";

export default function LoginPage() {
  const { step, setStep, phone, setPhone, loading, sendOtp, verifyOtp } = useLoginFlow();

  if (step === "otp") {
    return (
      <OTPForm
        phone={phone}
        onSubmit={verifyOtp}
        onBack={() => setStep("phone")}
        onResend={sendOtp}
        loading={loading}
      />
    );
  }

  return (
    <LoginForm
      phone={phone}
      onChange={setPhone}
      onSubmit={sendOtp}
      loading={loading}
    />
  );
}
