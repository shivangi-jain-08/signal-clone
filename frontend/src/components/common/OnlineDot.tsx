interface OnlineDotProps {
  /** Border colour — set to match the parent background for the cut-out effect */
  borderColor?: string;
  className?: string;
}

export function OnlineDot({ borderColor = "var(--color-bg-sidebar)", className = "" }: OnlineDotProps) {
  return (
    <span
      className={`absolute bottom-0 right-0 block rounded-full ${className}`}
      style={{
        width: 10,
        height: 10,
        backgroundColor: "var(--color-online)",
        border: `2px solid ${borderColor}`,
      }}
      aria-label="Online"
    />
  );
}
