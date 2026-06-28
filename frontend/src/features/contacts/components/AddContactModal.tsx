"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { useContacts, useAddContact } from "@/features/contacts/hooks/useContacts";
import { usersApi } from "@/services/api/users";

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddContactModal({ open, onClose }: AddContactModalProps) {
  const [search, setSearch] = useState("");
  const { data: contacts } = useContacts();
  const addContact = useAddContact();

  const { data: results, isFetching } = useQuery({
    queryKey: ["user-search", search],
    queryFn: () => usersApi.search(search),
    enabled: search.trim().length > 0,
    staleTime: 15_000,
  });

  const contactUserIds = new Set(contacts?.map((c) => c.contact_user.id) ?? []);

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title="Add Contact"
      maxWidth={480}
    >
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Search by name or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {isFetching && (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        )}

        {!isFetching && results && results.length === 0 && search.trim().length > 0 && (
          <p
            className="text-msg-preview text-center py-4"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            No users found
          </p>
        )}

        {!isFetching && results && results.length > 0 && (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {results.map((user) => {
              const isContact = contactUserIds.has(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 py-2"
                  style={{ borderBottom: "1px solid var(--color-divider)" }}
                >
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name}
                    userId={user.id}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-conv-name truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {user.display_name}
                    </p>
                    <p
                      className="text-msg-preview truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      @{user.username}
                    </p>
                  </div>
                  {isContact ? (
                    <span
                      className="text-msg-preview"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      Added
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addContact.mutate(user.id)}
                      disabled={addContact.isPending}
                    >
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
