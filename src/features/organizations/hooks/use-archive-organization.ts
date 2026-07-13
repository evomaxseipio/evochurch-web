"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  archiveOrganizationAction,
  reactivateOrganizationAction,
} from "@/app/apps/backoffice/organizations/actions";
import { organizationKeys } from "./query-keys";

export function useArchiveOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await archiveOrganizationAction(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
      toast.success("Organización archivada.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo archivar la organización.",
      );
    },
  });
}

export function useReactivateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await reactivateOrganizationAction(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
      toast.success("Organización reactivada.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo reactivar la organización.",
      );
    },
  });
}
