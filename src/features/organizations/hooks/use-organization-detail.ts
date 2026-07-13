"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrganizationAction } from "@/app/apps/backoffice/organizations/actions";
import { unwrapOrganizationAction } from "./organization-action.utils";
import { organizationKeys } from "./query-keys";

export { isOrganizationVm } from "./query-keys";

export function useOrganizationDetail(id: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: async () => {
      const result = await getOrganizationAction(id);
      return unwrapOrganizationAction(result);
    },
    enabled: id.length > 0,
  });
}
