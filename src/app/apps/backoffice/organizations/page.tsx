import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { listOrganizationsAction } from "@/app/apps/backoffice/organizations/actions";
import { OrganizationsListView } from "@/features/organizations/components/organizations-list-view";
import { unwrapOrganizationAction } from "@/features/organizations/hooks/organization-action.utils";
import { organizationKeys } from "@/features/organizations/hooks/query-keys";
import {
  listQueryToRequest,
  parseOrganizationsListQuery,
  type OrganizationsSearchParams,
} from "@/features/organizations/utils/organizations-list-query";
import { getQueryClient } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<OrganizationsSearchParams>;
}) {
  const sp = await searchParams;
  const query = parseOrganizationsListQuery(sp);
  const listRequest = listQueryToRequest(query);
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: organizationKeys.list(listRequest),
    queryFn: async () => {
      const result = await listOrganizationsAction(listRequest);
      return unwrapOrganizationAction(result);
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrganizationsListView query={query} />
    </HydrationBoundary>
  );
}
