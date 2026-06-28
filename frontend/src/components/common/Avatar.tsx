"use client";

import { useState } from "react";
import { OnlineDot } from "./OnlineDot";

const SIZE_PX = {
  sm: 28,
  base: 32,
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 80,
} as const;

type AvatarSize = keyof typeof SIZE_PX;

function avatarColor(userId: string): string {
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `hsl(${hash % 360}, 60%, 45%)`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fontSizeForPx(px: number): number {
  if (px <= 32) return 10;
  if (px <= 48) return 14;
  if (px <= 64) return 18;
  return 24;
}

export interface AvatarProps {
  src?: string | null;
  name?: string;
  userId?: string;
  size?: AvatarSize;
  isOnline?: boolean;
  /** Parent bg colour so the dot border blends in */
  borderColor?: string;
  className?: string;
}

export function Avatar({
  src,
  name = "?",
  userId = "",
  size = "lg",
  isOnline = false,
  borderColor,
  className = "",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_PX[size];
  const showFallback = !src || imgError;

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden select-none ${className}`}
      style={{ width: px, height: px }}
    >
      {showFallback ? (
        <div
          className="w-full h-full flex items-center justify-center text-white font-semibold"
          style={{
            backgroundColor: avatarColor(userId || name),
            fontSize: fontSizeForPx(px),
          }}
        >
          {initials(name)}
        </div>
      ) : (
        <img
          src={src!}
          alt={name}
          width={px}
          height={px}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}

      {isOnline && <OnlineDot borderColor={borderColor} />}
    </div>
  );
}
