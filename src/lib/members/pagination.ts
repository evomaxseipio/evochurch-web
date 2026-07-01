export const MEMBERS_PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

export const DEFAULT_MEMBERS_PAGE_SIZE = 10;

export type MembersPageSize = (typeof MEMBERS_PAGE_SIZE_OPTIONS)[number];

export function parseMembersPageSize(value: string | undefined): MembersPageSize {
  const parsed = Number.parseInt(value ?? "", 10);
  if (
    MEMBERS_PAGE_SIZE_OPTIONS.includes(parsed as MembersPageSize)
  ) {
    return parsed as MembersPageSize;
  }
  return DEFAULT_MEMBERS_PAGE_SIZE;
}

export function buildMembersListUrl({
  filter = "all",
  query = "",
  page = 1,
  pageSize = DEFAULT_MEMBERS_PAGE_SIZE,
}: {
  filter?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (query.trim()) params.set("q", query.trim());
  if (page > 1) params.set("page", String(page));
  if (pageSize !== DEFAULT_MEMBERS_PAGE_SIZE) {
    params.set("size", String(pageSize));
  }
  const qs = params.toString();
  return qs ? `/members?${qs}` : "/members";
}
