export type ContributionCategory = "tithe" | "offering" | "donation";

export type ContributionCategoryFilter = ContributionCategory | "all";

export type CollectionMode = "individual" | "collective";

export type DonorKind = "member" | "visitor" | "anonymous" | "company";

export type IncomeType = {
  id: number;
  typeName: string;
  category: ContributionCategory;
};

export type Contribution = {
  incomeId: string;
  fundId: string;
  fundName: string;
  incomeTypeId: number;
  category: ContributionCategory;
  typeName: string;
  collectionMode: CollectionMode;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  isAnonymous: boolean;
  notes: string | null;
  contributorLabel: string;
  donorKind: DonorKind | null;
  profileId: string | null;
  companyName: string | null;
  createdAt: string | null;
};

export type ContributionInput = {
  incomeId?: string | null;
  incomeTypeId: number;
  fundId: string;
  collectionMode: CollectionMode;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  donorKind?: DonorKind;
  profileId?: string | null;
  companyName?: string | null;
};

export type ContributionsStats = {
  total: number;
  tithes: number;
  offerings: number;
  donations: number;
};

export type TopContributor = {
  key: string;
  name: string;
  subtitle: string;
  amount: number;
  profileId: string | null;
};

export type FundDistributionSlice = {
  fundId: string;
  label: string;
  amount: number;
  color: string;
};
