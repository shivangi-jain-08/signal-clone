import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center p-8 ${className}`}>
      <div style={{ color: "var(--color-text-tertiary)" }}>{icon}</div>
      <p className="text-msg-content" style={{ color: "var(--color-text-secondary)" }}>
        {title}
      </p>
      {subtitle && (
        <p className="text-msg-preview" style={{ color: "var(--color-text-tertiary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
