interface UnreadBadgeProps {
  count: number;
  className?: string;
}

/** Accent-coloured pill showing unread message count */
export function UnreadBadge({ count, className = "" }: UnreadBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={`text-badge inline-flex items-center justify-center shrink-0 rounded-full text-white ${className}`}
      style={{
        backgroundColor: "var(--color-accent)",
        minWidth: 20,
        height: 20,
        padding: "0 5px",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** "Admin" label for group member rows */
export function AdminBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-white ${className}`}
      style={{
        backgroundColor: "var(--color-accent)",
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      Admin
    </span>
  );
}
