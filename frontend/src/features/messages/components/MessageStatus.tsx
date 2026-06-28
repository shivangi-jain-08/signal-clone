"use client";

import type { MessageStatus as StatusType } from "@/types/models";
import { Clock, Check, CheckCheck, AlertTriangle } from "lucide-react";

interface MessageStatusProps {
  status: StatusType | null;
  size?: number;
}

const STATUS_COLORS: Record<string, string> = {
  sending:   "var(--color-text-tertiary)",
  sent:      "var(--color-text-tertiary)",
  delivered: "rgba(255,255,255,0.50)",
  read:      "#53BDEB",
  failed:    "var(--color-error)",
};

export function MessageStatus({ status, size = 14 }: MessageStatusProps) {
  if (!status) return null;

  const color = STATUS_COLORS[status] ?? "var(--color-text-tertiary)";

  switch (status) {
    case "sending":
      return <Clock size={size} style={{ color }} />;
    case "sent":
      return <Check size={size} style={{ color }} />;
    case "delivered":
      return <CheckCheck size={size} style={{ color }} />;
    case "read":
      return <CheckCheck size={size} style={{ color }} />;
    case "failed":
      return <AlertTriangle size={size} style={{ color }} />;
    default:
      return null;
  }
}
