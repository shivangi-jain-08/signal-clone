import { Lock } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function ConversationsPage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState
        icon={<Lock size={48} />}
        title="Your messages are end-to-end encrypted."
        subtitle="Click a conversation to start chatting."
      />
    </div>
  );
}
