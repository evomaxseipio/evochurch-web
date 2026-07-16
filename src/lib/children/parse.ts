import {
  GUARDIAN_RELATIONSHIPS,
  type ChildGuardian,
  type ChildGuardianInput,
  type ChildListItem,
  type ChildProfile,
  type ChildrenListResult,
  type ChildrenPagination,
  type GuardianRelationship,
} from "./types";
import type { Member } from "@/lib/members/types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function parseDateOnly(v: unknown): string {
  const s = str(v);
  if (!s) return "";
  return s.slice(0, 10);
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => String(item).trim()).filter(Boolean);
}

export function isGuardianRelationship(
  value: string,
): value is GuardianRelationship {
  return (GUARDIAN_RELATIONSHIPS as readonly string[]).includes(value);
}

export function parseChildGuardian(raw: unknown): ChildGuardian | null {
  const row = asRecord(raw);
  if (!row) return null;

  const guardianProfileId = str(
    row.guardianProfileId ?? row.guardian_profile_id,
  );
  const relationship = str(row.relationship);
  if (!guardianProfileId || !isGuardianRelationship(relationship)) return null;

  return {
    id: str(row.id) || undefined,
    guardianProfileId,
    guardianFirstName: str(row.guardianFirstName ?? row.guardian_first_name),
    guardianLastName: str(row.guardianLastName ?? row.guardian_last_name),
    relationship,
    isPrimary:
      row.isPrimary === true ||
      row.is_primary === true ||
      row.isPrimary === "true",
    phone: str(row.phone) || undefined,
  };
}

function parseChildBase(raw: Record<string, unknown>) {
  return {
    childId: str(raw.childId ?? raw.child_id),
    firstName: str(raw.firstName ?? raw.first_name),
    lastName: str(raw.lastName ?? raw.last_name),
    dateOfBirth: parseDateOnly(raw.dateOfBirth ?? raw.date_of_birth),
    allergies: parseStringArray(raw.allergies),
    emergencyContactName: str(
      raw.emergencyContactName ?? raw.emergency_contact_name,
    ),
    emergencyContactPhone: str(
      raw.emergencyContactPhone ?? raw.emergency_contact_phone,
    ),
    notes: str(raw.notes ?? raw.bio),
    guardians: (Array.isArray(raw.guardians) ? raw.guardians : [])
      .map(parseChildGuardian)
      .filter((g): g is ChildGuardian => g != null),
  };
}

export function parseChildListItem(raw: unknown): ChildListItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const base = parseChildBase(row);
  if (!base.childId || !base.firstName) return null;
  return base;
}

export function parseChildProfile(raw: unknown): ChildProfile | null {
  const row = asRecord(raw);
  if (!row) return null;
  const base = parseChildBase(row);
  if (!base.childId || !base.firstName) return null;
  return {
    ...base,
    churchId: Number(row.churchId ?? row.church_id ?? 0),
  };
}

function parsePagination(raw: unknown): ChildrenPagination {
  const row = asRecord(raw);
  return {
    page: Number(row?.page ?? 1) || 1,
    pageSize: Number(row?.pageSize ?? row?.page_size ?? 25) || 25,
    total: Number(row?.total ?? 0) || 0,
    totalPages: Number(row?.totalPages ?? row?.total_pages ?? 1) || 1,
  };
}

export function parseChildrenListResponse(data: unknown): ChildrenListResult {
  const root = asRecord(data);
  const children = (Array.isArray(root?.children) ? root.children : [])
    .map(parseChildListItem)
    .filter((c): c is ChildListItem => c != null);

  return {
    children,
    pagination: parsePagination(root?.pagination),
  };
}

export function parseChildProfileResponse(data: unknown): ChildProfile | null {
  const root = asRecord(data);
  return parseChildProfile(root?.child ?? data);
}

export function childFullName(child: {
  firstName: string;
  lastName: string;
}): string {
  return [child.firstName, child.lastName].filter(Boolean).join(" ").trim();
}

export function guardianFullName(guardian: ChildGuardian): string {
  return [guardian.guardianFirstName, guardian.guardianLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** Contact shown in children tables: primary guardian phone, else emergency. */
export function resolveChildContact(child: {
  guardians: ChildGuardian[];
  emergencyContactName: string;
  emergencyContactPhone: string;
}): {
  name: string;
  phone: string;
  source: "guardian" | "emergency";
} {
  const primary =
    child.guardians.find((g) => g.isPrimary) ?? child.guardians[0] ?? null;
  if (primary) {
    return {
      name: guardianFullName(primary),
      phone: primary.phone?.trim() || "",
      source: "guardian",
    };
  }
  return {
    name: child.emergencyContactName.trim(),
    phone: child.emergencyContactPhone.trim(),
    source: "emergency",
  };
}

export function computeAgeYears(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function summarizeAllergies(allergies: string[], max = 2): string {
  if (allergies.length === 0) return "";
  if (allergies.length <= max) return allergies.join(", ");
  return `${allergies.slice(0, max).join(", ")} +${allergies.length - max}`;
}

export function parseGuardiansJson(raw: string): ChildGuardianInput[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = asRecord(item);
        if (!row) return null;
        const guardianProfileId = str(
          row.guardianProfileId ?? row.guardian_profile_id,
        );
        const relationship = str(row.relationship);
        if (!guardianProfileId || !isGuardianRelationship(relationship)) {
          return null;
        }
        return {
          guardianProfileId,
          relationship,
          isPrimary:
            row.isPrimary === true ||
            row.is_primary === true ||
            row.isPrimary === "true",
        };
      })
      .filter((g): g is ChildGuardianInput => g != null);
  } catch {
    return [];
  }
}

/** Adapts a child list row to the Member shape used by ministry roster UI. */
export function childListItemAsMember(
  child: ChildListItem,
  churchId: number | null = null,
): Member {
  return {
    memberId: child.childId,
    churchId,
    firstName: child.firstName,
    lastName: child.lastName,
    nickName: "",
    dateOfBirth: child.dateOfBirth,
    gender: "",
    maritalStatus: "",
    nationality: "",
    idType: "",
    idNumber: "",
    isActive: true,
    isMember: false,
    isChild: true,
    bio: child.notes ?? "",
    membershipRoleId: "",
    membershipRole: "",
    bloodType: "",
    allergies: child.allergies,
    professions: [],
    employment: [],
    primaryEmployment: null,
    address: {
      streetAddress: "",
      stateProvince: "",
      cityState: "",
      country: "",
    },
    contact: {
      phone: child.emergencyContactPhone ?? "",
      mobilePhone: "",
      email: "",
    },
  };
}
