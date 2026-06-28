const SIZE_PX = { sm: 16, md: 24, lg: 40 } as const;
const BORDER_PX = { sm: 2, md: 3, lg: 4 } as const;

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const px = SIZE_PX[size];
  const b = BORDER_PX[size];
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full shrink-0 ${className}`}
      style={{
        width: px,
        height: px,
        border: `${b}px solid var(--color-border)`,
        borderTopColor: "var(--color-accent)",
      }}
    />
  );
}
