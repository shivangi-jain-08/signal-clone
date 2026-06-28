"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { contactsApi } from "@/services/api/contacts";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/components/ui/toast";

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.list(),
    select: (d) => d.contacts,
  });
}

export function useAddContact() {
  return useMutation({
    mutationFn: (userId: string) => contactsApi.add({ contact_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added.");
    },
    onError: () => {
      toast.error("Failed to add contact.");
    },
  });
}
