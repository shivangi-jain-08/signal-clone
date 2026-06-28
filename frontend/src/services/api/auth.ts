import { apiClient } from "./client";
import type { User } from "@/types/models";

export interface RegisterPayload {
  phone_number: string;
  username: string;
  display_name: string;
}

export interface AuthResult {
  token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient
      .post<{ data: { message: string; phone_number: string } }>(
        "/auth/register",
        payload,
      )
      .then((r) => r.data.data),

  sendOtp: (phone_number: string) =>
    apiClient
      .post<{ data: { message: string } }>("/auth/send-otp", { phone_number })
      .then((r) => r.data.data),

  verifyOtp: (phone_number: string, otp: string) =>
    apiClient
      .post<{ data: AuthResult }>("/auth/verify-otp", { phone_number, otp })
      .then((r) => r.data.data),

  logout: () => apiClient.post("/auth/logout"),
};
