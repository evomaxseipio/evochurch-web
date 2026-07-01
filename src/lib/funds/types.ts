export type FundStatusFilter = "all" | "active" | "inactive";

export type FundViewMode = "grid" | "list";

export type Fund = {
  fundId: string;
  churchId: number;
  name: string;
  description: string;
  targetAmount: number;
  startDate: string;
  endDate: string | null;
  totalContributions: number;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type FundsListStats = {
  total: number;
  active: number;
  totalRaised: number;
  goalProgress: number;
};

export type FundInput = {
  fundId?: string | null;
  name: string;
  description: string;
  targetAmount: number;
  totalContributions: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isPrimary: boolean;
};
