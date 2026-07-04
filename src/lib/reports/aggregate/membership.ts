import type { Member } from "@/lib/members/types";
import type { MembersListStats } from "@/lib/members/types";

export type MembershipAgeBucketKey =
  | "0-5"
  | "6-12"
  | "13-17"
  | "18-25"
  | "26-35"
  | "36-50"
  | "51-65"
  | "65+"
  | "unknown";

export type MembershipDemographics = {
  ageBuckets: Record<MembershipAgeBucketKey, number>;
  gender: { male: number; female: number; other: number; unknown: number };
};

function ageFromBirthdate(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function ageToCeadBucket(age: number | null): MembershipAgeBucketKey {
  if (age == null) return "unknown";
  if (age <= 5) return "0-5";
  if (age <= 12) return "6-12";
  if (age <= 17) return "13-17";
  if (age <= 25) return "18-25";
  if (age <= 35) return "26-35";
  if (age <= 50) return "36-50";
  if (age <= 65) return "51-65";
  return "65+";
}

export function aggregateMembershipDemographics(
  members: Member[],
): MembershipDemographics {
  const ageBuckets: MembershipDemographics["ageBuckets"] = {
    "0-5": 0,
    "6-12": 0,
    "13-17": 0,
    "18-25": 0,
    "26-35": 0,
    "36-50": 0,
    "51-65": 0,
    "65+": 0,
    unknown: 0,
  };
  const gender = { male: 0, female: 0, other: 0, unknown: 0 };

  for (const member of members) {
    const bucket = ageToCeadBucket(ageFromBirthdate(member.dateOfBirth));
    ageBuckets[bucket] += 1;

    const g = member.gender?.trim().toLowerCase();
    if (g === "m" || g === "male" || g === "masculino" || g === "hombre") {
      gender.male += 1;
    } else if (
      g === "f" ||
      g === "female" ||
      g === "femenino" ||
      g === "mujer"
    ) {
      gender.female += 1;
    } else if (g) {
      gender.other += 1;
    } else {
      gender.unknown += 1;
    }
  }

  return { ageBuckets, gender };
}

export function computeMembershipStats(members: Member[]): MembersListStats {
  let total = 0;
  let membersCount = 0;
  let visits = 0;
  let active = 0;
  let inactive = 0;

  for (const member of members) {
    total += 1;
    if (member.isMember) membersCount += 1;
    else visits += 1;
    if (member.isActive) active += 1;
    else inactive += 1;
  }

  return { total, members: membersCount, visits, active, inactive };
}
