import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SENDER_COLORS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse an ISO timestamp string as UTC.
 *
 * SQLite stores timezone-naive datetimes; Pydantic serialises them without a
 * timezone designator (e.g. "2026-06-29T12:30:00").  JavaScript treats bare
 * strings as local time, which shifts them by the UTC offset (5:30 in IST).
 * Appending "Z" forces UTC interpretation so toLocaleTimeString() converts
 * correctly to the user's local timezone.
 */
export function parseUtc(iso: string): Date {
  if (iso && !iso.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(iso)) {
    return new Date(iso + "Z");
  }
  return new Date(iso);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Assign a deterministic color from SENDER_COLORS based on user ID. */
export function getSenderColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return SENDER_COLORS[hash % SENDER_COLORS.length] ?? SENDER_COLORS[0];
}

/** Extract initials from a display name (max 2 chars). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

/** Check if two dates are more than N minutes apart. */
export function isGroupBoundary(a: string | Date, b: string | Date, minutes = 2): boolean {
  const dateA = typeof a === "string" ? new Date(a) : a;
  const dateB = typeof b === "string" ? new Date(b) : b;
  return Math.abs(dateA.getTime() - dateB.getTime()) > minutes * 60 * 1000;
}
