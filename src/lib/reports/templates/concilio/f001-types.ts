import type { MonthPeriod } from "@/lib/reports/period";

export type ConcilioF001LineItem = {
  key: string;
  amount: number;
};

export type ConcilioF001CouncilLine = ConcilioF001LineItem & {
  percent?: number | null;
  formulaKey?: string;
};

export type ConcilioF001CooperativeBlock = {
  savings: number;
  loanPayment: number;
  funeralPlan: number;
};

export type ConcilioF001Payload = {
  churchId: number;
  churchName?: string;
  pastorName?: string;
  presbyterio?: string;
  generatedAt: string;
  period: MonthPeriod;
  periodLabel: string;
  meta: {
    formCode: string;
    councilHeader: string;
    presbyterio: string;
    presbyterName: string;
    pastorName: string;
    pastorCredential: string;
    churchName: string;
    churchCode: string;
    spouseName?: string;
    spouseCredential?: string;
    treasurerName: string;
    month: number;
    year: number;
    preparedAt?: string;
    receivedAtNationalOffice?: string | null;
  };
  sectionB: {
    generalIncome: ConcilioF001LineItem[];
    ministryIncome: ConcilioF001LineItem[];
    churchExpenses: ConcilioF001LineItem[];
    totals: {
      generalIncome: number;
      ministryIncome: number;
      churchExpenses: number;
    };
  };
  sectionC: {
    churchToCouncil: ConcilioF001CouncilLine[];
    ministryToNational: ConcilioF001CouncilLine[];
    specialContributions: ConcilioF001CouncilLine[];
    subtotals: {
      churchToCouncil: number;
      ministryToNational: number;
      specialContributions: number;
    };
  };
  sectionD: {
    church: ConcilioF001CooperativeBlock;
    pastor: ConcilioF001CooperativeBlock;
    totalMovements: number;
    receivedAtNationalOffice?: string | null;
  };
  kpis: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    totalCouncilSends: number;
  };
  signatures: {
    treasurer?: string;
    pastor?: string;
    preparedOn?: string;
  };
};
