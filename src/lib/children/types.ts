export const GUARDIAN_RELATIONSHIPS = [
  "mother",
  "father",
  "guardian",
  "other",
] as const;

export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export type ChildGuardian = {
  id?: string;
  guardianProfileId: string;
  guardianFirstName: string;
  guardianLastName: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
};

export type ChildProfile = {
  childId: string;
  churchId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes?: string;
  guardians: ChildGuardian[];
};

export type ChildListItem = Pick<
  ChildProfile,
  | "childId"
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "allergies"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "notes"
  | "guardians"
>;

export type ChildrenPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ChildrenListResult = {
  children: ChildListItem[];
  pagination: ChildrenPagination;
};

export type ChildGuardianInput = {
  guardianProfileId: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
};

export type ChildProfileInput = {
  childId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  guardians: ChildGuardianInput[];
};
