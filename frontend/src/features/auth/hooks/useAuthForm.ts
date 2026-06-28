"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/api/auth";
import { usersApi } from "@/services/api/users";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/toast";

function extractError(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    const r = (e as { response?: { data?: { detail?: string } } }).response;
    return r?.data?.detail ?? fallback;
  }
  return fallback;
}

export function useLoginFlow() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function sendOtp() {
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      setStep("otp");
    } catch (e) {
      toast.error(extractError(e, "Failed to send OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(otp: string) {
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(phone, otp);
      setAuth(result.user, result.token);
      router.replace("/conversations");
    } catch (e) {
      toast.error(extractError(e, "Invalid OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return { step, setStep, phone, setPhone, loading, sendOtp, verifyOtp };
}

export function useRegisterFlow() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const updateUser = useAuthStore((s) => s.updateUser);

  async function register() {
    setLoading(true);
    try {
      await authApi.register({
        phone_number: phone,
        username: phone.replace(/\D/g, ""),
        display_name: displayName,
      });
      await authApi.sendOtp(phone);
      setStep("otp");
    } catch (e) {
      toast.error(extractError(e, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(otp: string) {
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(phone, otp);
      setAuth(result.user, result.token);
      if (displayName && displayName !== result.user.display_name) {
        const updatedUser = await usersApi.updateMe({ display_name: displayName });
        updateUser(updatedUser);
      }
      router.replace("/conversations");
    } catch (e) {
      toast.error(extractError(e, "Invalid OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return {
    step,
    setStep,
    phone,
    setPhone,
    displayName,
    setDisplayName,
    loading,
    register,
    verifyOtp,
  };
}
