"use client";

import { useRouter } from "next/navigation";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import { conversationsApi } from "@/services/api/conversations";
import { queryClient } from "@/lib/queryClient";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/button";
import { ConversationListSkeleton } from "@/components/common/Skeleton";
import { toast } from "@/components/ui/toast";

export function ContactList() {
  const { data: contacts, isLoading } = useContacts();
  const router = useRouter();

  async function handleStartChat(userId: string) {
    try {
      const conv = await conversationsApi.createDirect(userId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push("/conversations/" + conv.id);
    } catch {
      toast.error("Failed to start conversation.");
    }
  }

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8 text-msg-preview"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        No contacts yet
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-divider)" }}
        >
          <Avatar
            src={contact.contact_user.avatar_url}
            name={contact.contact_user.display_name}
            userId={contact.contact_user.id}
            size="md"
            isOnline={contact.contact_user.is_online}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-conv-name truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {contact.nickname ?? contact.contact_user.display_name}
            </p>
            {contact.nickname && (
              <p
                className="text-msg-preview truncate"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {contact.contact_user.display_name}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartChat(contact.contact_user.id)}
          >
            Start chat
          </Button>
        </div>
      ))}
    </div>
  );
}
