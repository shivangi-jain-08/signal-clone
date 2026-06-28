"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { connectSocket, disconnectSocket } from "@/services/socket/client";
import { registerSocketHandlers } from "@/services/socket/handlers";

/**
 * Manages the Socket.io connection lifecycle for the authenticated session.
 *
 * Call this once inside the authenticated layout. It:
 *  - connects the socket when the user is authenticated
 *  - registers all event handlers
 *  - disconnects and deregisters when the user logs out or the component unmounts
 */
export function useSocket(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Logged out — disconnect and clear handlers
      cleanupRef.current?.();
      cleanupRef.current = null;
      disconnectSocket();
      return;
    }

    connectSocket(token);
    cleanupRef.current = registerSocketHandlers();

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      disconnectSocket();
    };
  }, [isAuthenticated, token]);
}
