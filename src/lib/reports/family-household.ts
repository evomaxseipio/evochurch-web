import {
  FAMILY_PARENT_ROLES,
  type FamilyChild,
  type FamilyChildRelationship,
  type FamilyParentRole,
  isFamilyChildRelationship,
} from "@/lib/members/family";
import { parseChildGuardian } from "@/lib/children/parse";
import type { ChildGuardian } from "@/lib/children/types";

export const FAMILY_HOUSEHOLD_FILTERS = [
  "all",
  "complete",
  "incomplete",
  "adults_only",
  "with_ministry_children",
] as const;

export type FamilyHouseholdFilter = (typeof FAMILY_HOUSEHOLD_FILTERS)[number];

export const FAMILY_HOUSEHOLD_STATUSES = [
  "complete",
  "incomplete",
  "alerts",
] as const;

export type FamilyHouseholdStatus = (typeof FAMILY_HOUSEHOLD_STATUSES)[number];

export type FamilyHouseholdListItem = {
  familyLabel: string;
  anchorProfileId: string;
  adultsLabel: string;
  anchorFirstName: string;
  anchorLastName: string;
  spouseFirstName: string;
  spouseLastName: string;
  memberCount: number;
  childrenCount: number;
  ministryChildrenCount: number;
  hasSpouse: boolean;
  hasMinistryChildren: boolean;
  status: FamilyHouseholdStatus;
  phone: string | null;
};

export type FamilyHouseholdSummary = {
  households: number;
  complete: number;
  incomplete: number;
  withMinistryChildren: number;
};

export type FamilyHouseholdListPage = {
  items: FamilyHouseholdListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: FamilyHouseholdSummary;
};

export type FamilyHouseholdAdult = {
  profileId: string;
  firstName: string;
  lastName: string;
  gender: string;
  isMember: boolean;
  isActive: boolean;
  maritalStatus: string;
  membershipRole: string;
  phone: string;
  role: FamilyParentRole;
};

export type FamilyHouseholdChild = FamilyChild & {
  age: number | null;
};

export type FamilyHouseholdDetail = {
  familyLabel: string;
  anchorProfileId: string;
  status: FamilyHouseholdStatus;
  hasSpouse: boolean;
  memberCount: number;
  childrenCount: number;
  ministryChildrenCount: number;
  adultsCount: number;
  anchor: FamilyHouseholdAdult;
  spouse: FamilyHouseholdAdult | null;
  children: FamilyHouseholdChild[];
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

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function isFamilyHouseholdStatus(v: string): v is FamilyHouseholdStatus {
  return (FAMILY_HOUSEHOLD_STATUSES as readonly string[]).includes(v);
}

function isFamilyParentRole(value: string): value is FamilyParentRole {
  return (FAMILY_PARENT_ROLES as readonly string[]).includes(value);
}

function parseStatus(raw: unknown): FamilyHouseholdStatus {
  const s = str(raw, "alerts");
  return isFamilyHouseholdStatus(s) ? s : "alerts";
}

export function isFamilyHouseholdFilter(v: string): v is FamilyHouseholdFilter {
  return (FAMILY_HOUSEHOLD_FILTERS as readonly string[]).includes(v);
}

function parseAdult(raw: unknown): FamilyHouseholdAdult | null {
  const row = asRecord(raw);
  if (!row) return null;
  const profileId = str(row.profileId ?? row.profile_id);
  if (!profileId) return null;
  const role = str(row.role ?? row.parentRole ?? row.parent_role, "parent");
  return {
    profileId,
    firstName: str(row.firstName ?? row.first_name),
    lastName: str(row.lastName ?? row.last_name),
    gender: str(row.gender),
    isMember: row.isMember === true || row.is_member === true,
    isActive: row.isActive !== false && row.is_active !== false,
    maritalStatus: str(row.maritalStatus ?? row.marital_status),
    membershipRole: str(row.membershipRole ?? row.membership_role, "Visita"),
    phone: str(row.phone),
    role: isFamilyParentRole(role) ? role : "parent",
  };
}

function parseHouseholdChild(raw: unknown): FamilyHouseholdChild | null {
  const row = asRecord(raw);
  if (!row) return null;

  const profileId = str(row.profileId ?? row.profile_id ?? row.childId ?? row.child_id);
  if (!profileId) return null;

  const rel = str(row.familyRelationship ?? row.family_relationship, "child");
  const familyRelationship: FamilyChildRelationship = isFamilyChildRelationship(rel)
    ? rel
    : "child";

  const ageRaw = row.age;
  const age =
    ageRaw == null || ageRaw === ""
      ? null
      : Number.isFinite(Number(ageRaw))
        ? Number(ageRaw)
        : null;

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
    age,
  };
}

function parseListItem(raw: unknown): FamilyHouseholdListItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const anchorProfileId = str(row.anchorProfileId ?? row.anchor_profile_id);
  if (!anchorProfileId) return null;

  return {
    familyLabel: str(row.familyLabel ?? row.family_label, "Familia"),
    anchorProfileId,
    adultsLabel: str(row.adultsLabel ?? row.adults_label),
    anchorFirstName: str(row.anchorFirstName ?? row.anchor_first_name),
    anchorLastName: str(row.anchorLastName ?? row.anchor_last_name),
    spouseFirstName: str(row.spouseFirstName ?? row.spouse_first_name),
    spouseLastName: str(row.spouseLastName ?? row.spouse_last_name),
    memberCount: num(row.memberCount ?? row.member_count),
    childrenCount: num(row.childrenCount ?? row.children_count),
    ministryChildrenCount: num(
      row.ministryChildrenCount ?? row.ministry_children_count,
    ),
    hasSpouse: row.hasSpouse === true || row.has_spouse === true,
    hasMinistryChildren:
      row.hasMinistryChildren === true || row.has_ministry_children === true,
    status: parseStatus(row.status),
    phone: str(row.phone) || null,
  };
}

export function parseFamilyHouseholdListResponse(
  data: unknown,
): FamilyHouseholdListPage {
  const root = asRecord(data);
  const summaryRow = asRecord(root?.summary);
  return {
    items: (Array.isArray(root?.items) ? root.items : [])
      .map(parseListItem)
      .filter((item): item is FamilyHouseholdListItem => item != null),
    total: num(root?.total),
    page: num(root?.page, 1),
    pageSize: num(root?.pageSize ?? root?.page_size, 25),
    summary: {
      households: num(summaryRow?.households),
      complete: num(summaryRow?.complete),
      incomplete: num(summaryRow?.incomplete),
      withMinistryChildren: num(
        summaryRow?.withMinistryChildren ?? summaryRow?.with_ministry_children,
      ),
    },
  };
}

export function parseFamilyHouseholdDetailResponse(
  data: unknown,
): FamilyHouseholdDetail | null {
  const root = asRecord(data);
  if (!root) return null;
  if (root.success === false) return null;

  const anchor = parseAdult(root.anchor);
  if (!anchor) return null;

  return {
    familyLabel: str(root.familyLabel ?? root.family_label, "Familia"),
    anchorProfileId: str(root.anchorProfileId ?? root.anchor_profile_id, anchor.profileId),
    status: parseStatus(root.status),
    hasSpouse: root.hasSpouse === true || root.has_spouse === true,
    memberCount: num(root.memberCount ?? root.member_count),
    childrenCount: num(root.childrenCount ?? root.children_count),
    ministryChildrenCount: num(
      root.ministryChildrenCount ?? root.ministry_children_count,
    ),
    adultsCount: num(root.adultsCount ?? root.adults_count, 1),
    anchor,
    spouse: parseAdult(root.spouse),
    children: (Array.isArray(root.children) ? root.children : [])
      .map(parseHouseholdChild)
      .filter((c): c is FamilyHouseholdChild => c != null),
  };
}

export function familyHouseholdAdultName(person: {
  firstName: string;
  lastName: string;
}): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

export function familyHouseholdInitials(person: {
  firstName: string;
  lastName: string;
}): string {
  const a = person.firstName.trim().charAt(0);
  const b = person.lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}
