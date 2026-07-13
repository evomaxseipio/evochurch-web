"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteOrganizationAction } from "@/app/apps/backoffice/organizations/actions";
import { organizationKeys } from "./query-keys";

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteOrganizationAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      toast.success("Organización eliminada.");
      router.push("/apps/backoffice/organizations");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar la organización.",
      );
    },
  });
}
