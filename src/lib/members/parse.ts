import {
  normalizeGender,
  normalizeIdType,
  normalizeMaritalStatus,
} from "@/lib/members/catalogs";
import {
  DEFAULT_MEMBERS_PAGE_SIZE,
  parseMembersPageSize,
} from "@/lib/members/pagination";
import type {
  Member,
  MemberCollectionRow,
  MemberFinanceSummary,
  MembersListStats,
  MembersPageResult,
  MembersPagination,
  MembershipHistoryEntry,
  MembershipRecord,
  ProfileEmployment,
} from "./types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function parseDateOnly(v: unknown): string {
  const s = str(v);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Mirrors Flutter `MembersModel.fromJson` + `Member.fromJson`. */
export function parseMembersResponse(data: unknown): Member[] {
  const root = asRecord(data);
  if (!root) {
    if (Array.isArray(data)) {
      return data
        .map((row) => parseMember(row))
        .filter((m): m is Member => m != null);
    }
    return [];
  }

  const list =
    (root.member_list as unknown[]) ??
    (root.memberList as unknown[]) ??
    [];

  return list
    .map((row) => parseMember(row))
    .filter((m): m is Member => m != null);
}

const EMPTY_STATS: MembersListStats = {
  total: 0,
  members: 0,
  visits: 0,
  active: 0,
  inactive: 0,
};

export function parseMembersPageResponse(data: unknown): MembersPageResult {
  const root = asRecord(data);
  if (!root) {
    return {
      members: parseMembersResponse(data),
      stats: EMPTY_STATS,
      pagination: { page: 1, pageSize: DEFAULT_MEMBERS_PAGE_SIZE, total: 0, totalPages: 1 },
    };
  }

  const paginationRaw = asRecord(root.pagination);
  const statsRaw = asRecord(root.stats);

  const pagination: MembersPagination = {
    page: Number(paginationRaw?.page ?? 1),
    pageSize: parseMembersPageSize(
      String(paginationRaw?.page_size ?? paginationRaw?.pageSize ?? DEFAULT_MEMBERS_PAGE_SIZE),
    ),
    total: Number(paginationRaw?.total ?? 0),
    totalPages: Number(paginationRaw?.total_pages ?? paginationRaw?.totalPages ?? 1),
  };

  const stats: MembersListStats = {
    total: Number(statsRaw?.total ?? pagination.total),
    members: Number(statsRaw?.members ?? 0),
    visits: Number(statsRaw?.visits ?? 0),
    active: Number(statsRaw?.active ?? 0),
    inactive: Number(statsRaw?.inactive ?? 0),
  };

  return {
    members: parseMembersResponse(data),
    stats,
    pagination,
  };
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => str(item))
    .filter(Boolean);
}

function parseEmployment(raw: unknown): ProfileEmployment | null {
  const json = asRecord(raw);
  if (!json) return null;

  const id = str(json.id);
  if (!id) return null;

  return {
    id,
    employerName: str(json.employerName ?? json.employer_name),
    jobTitle: str(json.jobTitle ?? json.job_title),
    sector: str(json.sector),
    workPhone: str(json.workPhone ?? json.work_phone),
    workEmail: str(json.workEmail ?? json.work_email),
    isPrimary: bool(json.isPrimary ?? json.is_primary),
    startDate: parseDateOnly(json.startDate ?? json.start_date),
    endDate: parseDateOnly(json.endDate ?? json.end_date),
    source: str(json.source, "staff"),
    notes: str(json.notes),
    marketplaceOptIn: bool(json.marketplaceOptIn ?? json.marketplace_opt_in),
  };
}

function parseEmploymentList(v: unknown): ProfileEmployment[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => parseEmployment(row))
    .filter((row): row is ProfileEmployment => row != null);
}

export function parseMember(raw: unknown): Member | null {
  const json = asRecord(raw);
  if (!json) return null;

  const addr = asRecord(json.address);
  const cont = asRecord(json.contact);

  const memberId = str(json.memberId ?? json.member_id ?? json.id);
  if (!memberId) return null;

  const employment = parseEmploymentList(json.employment);

  return {
    memberId,
    churchId: parseChurchId(json.churchId ?? json.church_id),
    firstName: str(json.firstName ?? json.first_name),
    lastName: str(json.lastName ?? json.last_name),
    nickName: str(json.nickName ?? json.nickname ?? json.nick_name),
    dateOfBirth: parseDateOnly(json.dateOfBirth ?? json.date_of_birth),
    gender: normalizeGender(str(json.gender)),
    maritalStatus: normalizeMaritalStatus(
      str(json.maritalStatus ?? json.marital_status),
    ),
    nationality: str(json.nationality),
    idType: normalizeIdType(str(json.idType ?? json.id_type)),
    idNumber: str(json.idNumber ?? json.id_number),
    isActive: bool(json.isActive ?? json.is_active),
    isMember: bool(json.isMember ?? json.is_member),
    isChild: bool(json.isChild ?? json.is_child),
    bio: str(json.bio),
    membershipRoleId: str(
      json.membershipRoleId ?? json.membership_role_id ?? json.memberRoleId,
    ),
    membershipRole: str(
      json.membershipRole ?? json.membership_role ?? json.role,
      "Visita",
    ),
    bloodType: str(json.bloodType ?? json.blood_type),
    allergies: parseStringArray(json.allergies),
    professions: parseStringArray(json.professions),
    employment,
    primaryEmployment: employment.find((e) => e.isPrimary) ?? null,
    address: {
      streetAddress: str(addr?.streetAddress ?? addr?.street_address),
      stateProvince: str(addr?.stateProvince ?? addr?.state_province),
      cityState: str(addr?.cityState ?? addr?.city_state),
      country: str(addr?.country),
    },
    contact: {
      phone: str(cont?.phone),
      mobilePhone: str(cont?.mobilePhone ?? cont?.mobile_phone),
      email: str(cont?.email),
    },
  };
}

function parseChurchId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export function memberFullName(m: Member): string {
  return [m.firstName, m.lastName].filter(Boolean).join(" ") || "Sin nombre";
}

export function memberInitials(m: Member): string {
  const parts = memberFullName(m).split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function memberStatusLabel(m: Member): string {
  if (!m.isActive) return "Inactivo";
  if (!m.isMember) return "Visita";
  return "Activo";
}

export function parseMembershipResponse(data: unknown): MembershipRecord | null {
  const root = asRecord(data);
  if (!root) return null;

  const list = (root.membership as unknown[]) ?? [];
  const first = asRecord(list[0]);
  if (!first) return null;

  const history = (first.membershipHistory as unknown[]) ?? [];
  return {
    profileId: str(first.profileId ?? first.profile_id),
    baptismDate: parseDateOnly(first.baptismDate ?? first.baptism_date),
    baptismChurch: str(first.baptismChurch ?? first.baptism_church),
    baptismPastor: str(first.baptismPastor ?? first.baptism_pastor),
    membershipRoleId: str(first.membershipRoleId ?? first.membership_role_id),
    membershipRole: str(first.membershipRole ?? first.membership_role),
    baptismChurchCity: str(
      first.baptismChurchCity ?? first.baptism_church_city,
    ),
    baptismChurchCountry: str(
      first.baptismChurchCountry ?? first.baptism_church_country,
    ),
    hasCredential: bool(first.hasCredential ?? first.has_credential),
    isBaptizedInSpirit: bool(
      first.isBaptizedInSpirit ?? first.is_baptized_in_spirit,
    ),
    membershipHistory: history
      .map((h): MembershipHistoryEntry | null => {
        const row = asRecord(h);
        if (!row) return null;
        return {
          dateStart: parseDateOnly(row.dateStart ?? row.date_start),
          dateReturned:
            row.dateReturned != null || row.date_returned != null
              ? parseDateOnly(row.dateReturned ?? row.date_returned)
              : null,
          observations: str(row.observations),
        };
      })
      .filter((h): h is MembershipHistoryEntry => h != null),
  };
}

export function parseMemberFinance(data: unknown): {
  summary: MemberFinanceSummary;
  collections: MemberCollectionRow[];
} {
  const root = asRecord(data);
  const empty = {
    summary: {
      tithesAmount: 0,
      offeringAmount: 0,
      donationAmount: 0,
      totalContributions: 0,
    },
    collections: [] as MemberCollectionRow[],
  };
  if (!root) return empty;

  const header = asRecord(
    root.collection_header_details ?? root.collectionHeaderDetails,
  );
  const list = (root.collection_list as unknown[]) ?? [];

  return {
    summary: {
      tithesAmount: Number(header?.tithes_amount ?? header?.tithesAmount ?? 0),
      offeringAmount: Number(
        header?.offering_amount ?? header?.offeringAmount ?? 0,
      ),
      donationAmount: Number(
        header?.donation_amount ?? header?.donationAmount ?? 0,
      ),
      totalContributions: Number(
        header?.total_contributions ?? header?.totalContributions ?? 0,
      ),
    },
    collections: list
      .map((row): MemberCollectionRow | null => {
        const r = asRecord(row);
        if (!r) return null;
        return {
          collectionId: str(r.collection_id ?? r.collectionId),
          collectionType: Number(r.collection_type ?? r.collectionType ?? 0),
          collectionTypeName: str(
            r.collection_type_name ?? r.collectionTypeName,
          ),
          collectionDate: parseDateOnly(
            r.collection_date ?? r.collectionDate,
          ),
          collectionAmount: Number(r.collection_amount ?? r.collectionAmount ?? 0),
          paymentMethod: str(r.payment_method ?? r.paymentMethod),
          comments: str(r.comments),
        };
      })
      .filter((r): r is MemberCollectionRow => r != null),
  };
}
