import { parseChildGuardian } from "@/lib/children/parse";
import type { ChildGuardian } from "@/lib/children/types";

export const FAMILY_CHILD_RELATIONSHIPS = [
  "son",
  "daughter",
  "child",
  "other",
] as const;

export type FamilyChildRelationship = (typeof FAMILY_CHILD_RELATIONSHIPS)[number];

export const FAMILY_PARENT_ROLES = ["father", "mother", "parent"] as const;
export type FamilyParentRole = (typeof FAMILY_PARENT_ROLES)[number];

export type MemberFamilySpouse = {
  profileId: string;
  firstName: string;
  lastName: string;
  gender: string;
  isMember: boolean;
  isActive: boolean;
  maritalStatus: string;
  membershipRole: string;
};

export type FamilyParent = {
  profileId: string;
  firstName: string;
  lastName: string;
  gender: string;
  isMember: boolean;
  isActive: boolean;
  maritalStatus: string;
  membershipRole: string;
  parentRole: FamilyParentRole;
  inferredFromSpouse: boolean;
};

export type FamilyChild = {
  profileId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  isChild: boolean;
  isMember: boolean;
  isActive: boolean;
  membershipRole: string;
  familyRelationship: FamilyChildRelationship;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  guardians: ChildGuardian[];
};

export type MemberFamilyData = {
  spouse: MemberFamilySpouse | null;
  parents: FamilyParent[];
  children: FamilyChild[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => String(item).trim()).filter(Boolean);
}

function parseDateOnly(v: unknown): string {
  const s = str(v);
  if (!s) return "";
  return s.slice(0, 10);
}

export function isFamilyChildRelationship(
  value: string,
): value is FamilyChildRelationship {
  return (FAMILY_CHILD_RELATIONSHIPS as readonly string[]).includes(value);
}

function isFamilyParentRole(value: string): value is FamilyParentRole {
  return (FAMILY_PARENT_ROLES as readonly string[]).includes(value);
}

function parseFamilyChild(raw: unknown): FamilyChild | null {
  const row = asRecord(raw);
  if (!row) return null;

  const profileId = str(row.profileId ?? row.profile_id ?? row.childId ?? row.child_id);
  if (!profileId) return null;

  const rel = str(row.familyRelationship ?? row.family_relationship, "child");
  const familyRelationship: FamilyChildRelationship = isFamilyChildRelationship(rel)
    ? rel
    : "child";

  return {
    profileId,
    firstName: str(row.firstName ?? row.first_name),
    lastName: str(row.lastName ?? row.last_name),
    dateOfBirth: parseDateOnly(row.dateOfBirth ?? row.date_of_birth),
    gender: str(row.gender),
    isChild: row.isChild === true || row.is_child === true,
    isMember: row.isMember === true || row.is_member === true,
    isActive: row.isActive !== false && row.is_active !== false,
    membershipRole: str(row.membershipRole ?? row.membership_role, "Visita"),
    familyRelationship,
    allergies: parseStringArray(row.allergies),
    emergencyContactName: str(
      row.emergencyContactName ?? row.emergency_contact_name,
    ),
    emergencyContactPhone: str(
      row.emergencyContactPhone ?? row.emergency_contact_phone,
    ),
    notes: str(row.notes ?? row.bio),
    guardians: (Array.isArray(row.guardians) ? row.guardians : [])
      .map(parseChildGuardian)
      .filter((g): g is ChildGuardian => g != null),
  };
}

function parseFamilyParent(raw: unknown): FamilyParent | null {
  const row = asRecord(raw);
  if (!row) return null;

  const profileId = str(row.profileId ?? row.profile_id);
  if (!profileId) return null;

  const role = str(row.parentRole ?? row.parent_role, "parent");
  return {
    profileId,
    firstName: str(row.firstName ?? row.first_name),
    lastName: str(row.lastName ?? row.last_name),
    gender: str(row.gender),
    isMember: row.isMember === true || row.is_member === true,
    isActive: row.isActive !== false && row.is_active !== false,
    maritalStatus: str(row.maritalStatus ?? row.marital_status),
    membershipRole: str(row.membershipRole ?? row.membership_role, "Visita"),
    parentRole: isFamilyParentRole(role) ? role : "parent",
    inferredFromSpouse:
      row.inferredFromSpouse === true || row.inferred_from_spouse === true,
  };
}

function parseSpouse(raw: unknown): MemberFamilySpouse | null {
  const row = asRecord(raw);
  if (!row) return null;

  const profileId = str(row.profileId ?? row.profile_id);
  if (!profileId) return null;

  return {
    profileId,
    firstName: str(row.firstName ?? row.first_name),
    lastName: str(row.lastName ?? row.last_name),
    gender: str(row.gender),
    isMember: row.isMember === true || row.is_member === true,
    isActive: row.isActive === true || row.is_active === true,
    maritalStatus: str(row.maritalStatus ?? row.marital_status),
    membershipRole: str(row.membershipRole ?? row.membership_role, "Visita"),
  };
}

export function parseMemberFamilyResponse(data: unknown): MemberFamilyData {
  const root = asRecord(data);
  const spouse = parseSpouse(root?.spouse);
  const parents = (Array.isArray(root?.parents) ? root.parents : [])
    .map(parseFamilyParent)
    .filter((p): p is FamilyParent => p != null);
  const children = (Array.isArray(root?.children) ? root.children : [])
    .map(parseFamilyChild)
    .filter((c): c is FamilyChild => c != null);

  return { spouse, parents, children };
}

export function memberFamilyPersonName(person: {
  firstName: string;
  lastName: string;
}): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

export function memberFamilySpouseName(spouse: MemberFamilySpouse): string {
  return memberFamilyPersonName(spouse);
}

export function familyChildFullName(child: Pick<FamilyChild, "firstName" | "lastName">): string {
  return memberFamilyPersonName(child);
}

export function familyRelationshipForGender(gender: string): FamilyChildRelationship {
  if (gender === "Female") return "daughter";
  if (gender === "Male") return "son";
  return "child";
}

export function familyChildProfileHref(child: FamilyChild): string {
  if (child.isChild) {
    return `/members/children/${child.profileId}`;
  }
  return `/members/profile?id=${child.profileId}`;
}
