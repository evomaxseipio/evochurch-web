"use client";

import { useQuery } from "@tanstack/react-query";
import { listOrganizationsAction } from "@/app/apps/backoffice/organizations/actions";
import type { ListOrganizationsRequest } from "../schemas/organization.requests";
import { unwrapOrganizationAction } from "./organization-action.utils";
import { organizationKeys } from "./query-keys";

export function useOrganizationsList(request: ListOrganizationsRequest) {
  return useQuery({
    queryKey: organizationKeys.list(request),
    queryFn: async () => {
      const result = await listOrganizationsAction(request);
      return unwrapOrganizationAction(result);
    },
  });
}
