import { BookImage } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function StoriesPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <EmptyState
        icon={<BookImage size={48} />}
        title="Stories — Coming Soon"
        subtitle="Share moments with your contacts. This feature is on the way."
      />
    </div>
  );
}
