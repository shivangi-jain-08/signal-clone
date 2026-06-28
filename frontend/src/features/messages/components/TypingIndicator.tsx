"use client";

/** Animated three-dot typing indicator (Signal style). */
export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : "Several people are typing…";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        opacity: 1,
        animation: "fadeIn 150ms ease",
      }}
      aria-label={label}
    >
      {/* Bubble */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "8px 14px",
          backgroundColor: "var(--color-bg-bubble-recv)",
          borderRadius: "18px 18px 18px 4px",
          minWidth: 56,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--color-text-secondary)",
              display: "inline-block",
              animation: `typingBounce 1.2s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>
      <span
        className="text-msg-preview"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}
      </span>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
