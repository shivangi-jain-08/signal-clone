"use client";

import { useCallback, useRef } from "react";
import { getSocket } from "@/services/socket/client";

/**
 * Debounced typing indicator hook.
 *
 * Call `emitTyping()` on every keystroke.
 * The hook debounces stop_typing — if no new call arrives within 3s it emits stop.
 */
export function useTyping(conversationId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const emitStop = useCallback(() => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    getSocket().emit("stop_typing", { conversation_id: conversationId });
  }, [conversationId]);

  const emitTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit("typing", { conversation_id: conversationId });
    }
    // reset debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(emitStop, 3000);
  }, [conversationId, emitStop]);

  const cancelTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    emitStop();
  }, [emitStop]);

  return { emitTyping, cancelTyping };
}
