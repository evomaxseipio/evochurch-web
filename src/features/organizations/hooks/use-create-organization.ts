"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrganizationAction } from "@/app/apps/backoffice/organizations/actions";
import type { CreateOrganizationRequest } from "../schemas/organization.requests";
import { isOrganizationActionError } from "./organization-action.utils";
import { organizationKeys } from "./query-keys";

type CreateVariables = {
  request: CreateOrganizationRequest;
  allowDuplicate?: boolean;
  /** Si true (default en create), navega al detalle tras éxito. */
  redirectToDetail?: boolean;
};

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      request,
      allowDuplicate,
    }: CreateVariables) => {
      return createOrganizationAction(request, { allowDuplicate });
    },
    onSuccess: (result, variables) => {
      if (!result.ok) return;

      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      toast.success("Organización creada correctamente.");

      if (variables.redirectToDetail !== false) {
        router.push(`/apps/backoffice/organizations/${result.data.id}`);
      }
    },
    onError: (error) => {
      if (isOrganizationActionError(error)) return;
      toast.error("No se pudo crear la organización.");
    },
  });
}
