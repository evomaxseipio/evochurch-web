export type MemberAddress = {
  streetAddress: string;
  stateProvince: string;
  cityState: string;
  country: string;
};

export type MemberContact = {
  phone: string;
  mobilePhone: string;
  email: string;
};

export type ProfileEmployment = {
  id: string;
  employerName: string;
  jobTitle: string;
  sector: string;
  workPhone: string;
  workEmail: string;
  isPrimary: boolean;
  startDate: string;
  endDate: string;
  source: string;
  notes: string;
  marketplaceOptIn: boolean;
};

export type Member = {
  memberId: string;
  churchId: number | null;
  firstName: string;
  lastName: string;
  nickName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  idType: string;
  idNumber: string;
  isActive: boolean;
  isMember: boolean;
  isChild?: boolean;
  bio: string;
  membershipRoleId: string;
  membershipRole: string;
  bloodType: string;
  allergies: string[];
  professions: string[];
  employment: ProfileEmployment[];
  primaryEmployment: ProfileEmployment | null;
  address: MemberAddress;
  contact: MemberContact;
};

export type MembershipRecord = {
  profileId: string;
  baptismDate: string;
  baptismChurch: string;
  baptismPastor: string;
  membershipRoleId: string;
  membershipRole: string;
  baptismChurchCity: string;
  baptismChurchCountry: string;
  hasCredential: boolean;
  isBaptizedInSpirit: boolean;
  membershipHistory: MembershipHistoryEntry[];
};

export type MembershipHistoryEntry = {
  dateStart: string;
  dateReturned: string | null;
  observations: string;
};

export type MemberFinanceSummary = {
  tithesAmount: number;
  offeringAmount: number;
  donationAmount: number;
  totalContributions: number;
};

export type MemberFinanceChartPoint = {
  label: string;
  tithe: number;
  offer: number;
  donation: number;
};

export type MemberFinanceData = {
  statusCode: number;
  message: string;
  summary: MemberFinanceSummary;
  chartData: MemberFinanceChartPoint[];
  collections: MemberCollectionRow[];
};

export type MemberCollectionRow = {
  collectionId: string;
  collectionType: number;
  collectionTypeName: string;
  collectionDate: string;
  collectionAmount: number;
  paymentMethod: string;
  comments: string;
};

export type MemberFilterKey =
  | "all"
  | "members"
  | "visits"
  | "active"
  | "inactive";

export type MembersListStats = {
  total: number;
  members: number;
  visits: number;
  active: number;
  inactive: number;
};

export type MembersPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MembersPageResult = {
  members: Member[];
  stats: MembersListStats;
  pagination: MembersPagination;
};

export type MemberProfileInput = {
  firstName: string;
  lastName: string;
  nickName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  idType: string;
  idNumber: string;
  isActive: boolean;
  isMember: boolean;
  bio: string;
  membershipRoleId: string;
  membershipRole: string;
  streetAddress: string;
  stateProvince: string;
  cityState: string;
  country: string;
  phone: string;
  mobilePhone: string;
  email: string;
  bloodType?: string;
  allergies?: string[];
  professions?: string[];
};

export type ProfileEmploymentInput = {
  profileId: string;
  employmentId?: string;
  employerName: string;
  jobTitle: string;
  sector: string;
  workPhone: string;
  workEmail: string;
  startDate: string;
  endDate?: string;
  notes: string;
};

export type MembershipInput = {
  profileId: string;
  baptismDate: string;
  baptismChurch: string;
  baptismPastor: string;
  membershipRoleId: string;
  baptismChurchCity: string;
  baptismChurchCountry: string;
  hasCredential: boolean;
  isBaptizedInSpirit: boolean;
};
