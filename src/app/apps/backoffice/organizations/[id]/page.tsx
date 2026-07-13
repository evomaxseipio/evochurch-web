import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getOrganizationAction } from "@/app/apps/backoffice/organizations/actions";
import { OrganizationDetailView } from "@/features/organizations/components/organization-detail-view";
import { unwrapOrganizationAction } from "@/features/organizations/hooks/organization-action.utils";
import { organizationKeys, isOrganizationVm } from "@/features/organizations/hooks/query-keys";
import { getQueryClient } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: async () => {
      const result = await getOrganizationAction(id);
      return unwrapOrganizationAction(result);
    },
  });

  const initialData = queryClient.getQueryData(organizationKeys.detail(id));
  if (!isOrganizationVm(initialData)) {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrganizationDetailView id={id} />
    </HydrationBoundary>
  );
}
