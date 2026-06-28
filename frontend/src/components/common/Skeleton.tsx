import { cn } from "@/lib/utils";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  className?: string;
}

const RADIUS_MAP = {
  none: "0",
  sm:   "var(--radius-sm)",
  md:   "var(--radius-md)",
  lg:   "var(--radius-lg)",
  full: "var(--radius-full)",
};

/** Single shimmer block. Compose into row/grid patterns for complex skeletons. */
export function Skeleton({ width, height = 16, rounded = "md", className }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{
        width,
        height,
        borderRadius: RADIUS_MAP[rounded],
        flexShrink: 0,
      }}
    />
  );
}

/** 5× conversation-list skeleton rows */
export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2" style={{ height: 72 }}>
          <Skeleton width={48} height={48} rounded="full" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between">
              <Skeleton width={120} height={14} />
              <Skeleton width={32} height={11} />
            </div>
            <Skeleton width={180} height={13} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Alternating-sides message skeleton */
export function MessageListSkeleton() {
  const rows = [
    { own: false, w: 240 }, { own: true,  w: 160 },
    { own: false, w: 200 }, { own: true,  w: 220 },
    { own: false, w: 180 }, { own: true,  w: 140 },
  ];
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {rows.map((r, i) => (
        <div key={i} className={`flex items-end gap-2 ${r.own ? "flex-row-reverse" : ""}`}>
          {!r.own && <Skeleton width={28} height={28} rounded="full" />}
          <Skeleton width={r.w} height={36} rounded="lg" />
        </div>
      ))}
    </div>
  );
}
