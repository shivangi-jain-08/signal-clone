interface DateSeparatorProps {
  label: string;
}

/** Horizontal rule with a centred date label between message groups */
export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 my-3 px-4">
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-divider)" }} />
      <span
        className="text-date-sep shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-divider)" }} />
    </div>
  );
}
