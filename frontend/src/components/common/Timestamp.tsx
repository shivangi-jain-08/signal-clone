import { parseUtc } from "@/lib/utils";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatConversationTimestamp(iso: string): string {
  const d = parseUtc(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();

  if (t >= todayStart) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (t >= todayStart - 86_400_000) return "Yesterday";
  if (t >= todayStart - 6 * 86_400_000) return DAYS[d.getDay()]!;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatMessageTimestamp(iso: string): string {
  return parseUtc(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface TimestampProps {
  iso: string;
  /** "conversation" → smart relative label; "message" → time-only */
  variant?: "conversation" | "message";
  className?: string;
  style?: React.CSSProperties;
}

/** Renders a <time> element with Signal-spec timestamp formatting */
export function Timestamp({ iso, variant = "conversation", className = "", style }: TimestampProps) {
  const text = variant === "message" ? formatMessageTimestamp(iso) : formatConversationTimestamp(iso);
  return (
    <time
      dateTime={iso}
      className={`text-timestamp ${className}`}
      style={{ color: "var(--color-text-timestamp)", ...style }}
    >
      {text}
    </time>
  );
}
