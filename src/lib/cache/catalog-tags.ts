import { revalidateTag } from "next/cache";

/** Cross-request cache tags for read-mostly catalog RPCs/queries. */
export const catalogTags = {
  funds: (churchId: number) => `catalog:funds:${churchId}`,
  incomeTypes: (churchId: number) => `catalog:income-types:${churchId}`,
  incomeTypesOperational: (churchId: number) =>
    `catalog:income-types-operational:${churchId}`,
  expenseTypes: (churchId: number) => `catalog:expense-types:${churchId}`,
  memberRoles: () => "catalog:member-roles",
  scriptureDaily: () => "catalog:scripture-daily",
} as const;

export function revalidateChurchCatalogs(churchId: number) {
  revalidateTag(catalogTags.funds(churchId), "max");
  revalidateTag(catalogTags.incomeTypes(churchId), "max");
  revalidateTag(catalogTags.incomeTypesOperational(churchId), "max");
  revalidateTag(catalogTags.expenseTypes(churchId), "max");
}

export function revalidateFundsCatalog(churchId: number) {
  revalidateTag(catalogTags.funds(churchId), "max");
}

export function revalidateIncomeTypesCatalog(churchId: number) {
  revalidateTag(catalogTags.incomeTypes(churchId), "max");
  revalidateTag(catalogTags.incomeTypesOperational(churchId), "max");
}

export function revalidateExpenseTypesCatalog(churchId: number) {
  revalidateTag(catalogTags.expenseTypes(churchId), "max");
}
