"use client";

import { useRegisterFlow } from "@/features/auth/hooks/useAuthForm";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { OTPForm } from "@/features/auth/components/OTPForm";

export default function RegisterPage() {
  const {
    step,
    setStep,
    phone,
    setPhone,
    displayName,
    setDisplayName,
    loading,
    register,
    verifyOtp,
  } = useRegisterFlow();

  if (step === "otp") {
    return (
      <OTPForm
        phone={phone}
        onSubmit={verifyOtp}
        onBack={() => setStep("phone")}
        onResend={register}
        loading={loading}
      />
    );
  }

  return (
    <RegisterForm
      phone={phone}
      displayName={displayName}
      onPhoneChange={setPhone}
      onNameChange={setDisplayName}
      onSubmit={register}
      loading={loading}
    />
  );
}
