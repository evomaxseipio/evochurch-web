"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateOrganizationAction } from "@/app/apps/backoffice/organizations/actions";
import type { UpdateOrganizationRequest } from "../schemas/organization.requests";
import { organizationKeys } from "./query-keys";

type UpdateVariables = {
  id: string;
  request: UpdateOrganizationRequest;
};

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request }: UpdateVariables) => {
      return updateOrganizationAction(id, request);
    },
    onSuccess: (result, variables) => {
      if (!result.ok) return;

      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(variables.id),
      });
      toast.success("Cambios guardados correctamente.");
    },
    onError: () => {
      toast.error("No se pudo actualizar la organización.");
    },
  });
}
