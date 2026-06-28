import { Phone } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function CallsPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <EmptyState
        icon={<Phone size={48} />}
        title="Calls — Coming Soon"
        subtitle="Voice and video calls will be available in a future update."
      />
    </div>
  );
}
