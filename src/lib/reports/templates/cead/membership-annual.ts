import { CATECHUMEN_ROLE_CODE } from "@/lib/members/roles";
import type { Member } from "@/lib/members/types";
import type { MembershipRecord } from "@/lib/members/types";
import {
  aggregateMembershipDemographics,
  type MembershipDemographics,
} from "@/lib/reports/aggregate/membership";
import { CEAD_AGE_BUCKET_LABELS } from "@/lib/reports/templates/cead/constants";

export type MembershipAnnualCeadFields = {
  year: number;
  baptizedMembersTotal: number;
  catechumens: number;
  adherentsVisits: number;
  totalCongregation: number;
  baptizedInSpirit: number;
  baptismsInWaterThisYear: number;
  ageBuckets: Record<string, number>;
  genderMale: number;
  genderFemale: number;
  genderOther: number;
  activeMinistries: string;
};

function isDateInYear(dateStr: string, year: number): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 4) === String(year);
}

function roleCodeMatchesCatechumen(
  member: Member,
  catechumenRoleId: string | null,
): boolean {
  if (!catechumenRoleId) {
    return member.membershipRole.toLowerCase().includes("catec");
  }
  return member.membershipRoleId === catechumenRoleId;
}

export function buildMembershipAnnualCeadFields(params: {
  year: number;
  members: Member[];
  memberships: Map<string, MembershipRecord | null>;
  catechumenRoleId?: string | null;
}): MembershipAnnualCeadFields {
  const activeMembers = params.members.filter((m) => m.isActive);
  const demographics: MembershipDemographics = aggregateMembershipDemographics(
    activeMembers,
  );

  let baptizedMembersTotal = 0;
  let baptizedInSpirit = 0;
  let baptismsInWaterThisYear = 0;
  let catechumens = 0;
  let adherentsVisits = 0;

  for (const member of activeMembers) {
    const membership = params.memberships.get(member.memberId);
    if (member.isMember && membership?.baptismDate) {
      baptizedMembersTotal += 1;
    }
    if (membership?.isBaptizedInSpirit) baptizedInSpirit += 1;
    if (membership?.baptismDate && isDateInYear(membership.baptismDate, params.year)) {
      baptismsInWaterThisYear += 1;
    }
    if (roleCodeMatchesCatechumen(member, params.catechumenRoleId ?? null)) {
      catechumens += 1;
    }
    if (!member.isMember) adherentsVisits += 1;
  }

  const ageBuckets: Record<string, number> = {};
  for (const label of CEAD_AGE_BUCKET_LABELS) {
    ageBuckets[label] = demographics.ageBuckets[label] ?? 0;
  }
  ageBuckets["Sin dato"] = demographics.ageBuckets.unknown ?? 0;

  return {
    year: params.year,
    baptizedMembersTotal,
    catechumens,
    adherentsVisits,
    totalCongregation: activeMembers.length,
    baptizedInSpirit,
    baptismsInWaterThisYear,
    ageBuckets,
    genderMale: demographics.gender.male,
    genderFemale: demographics.gender.female,
    genderOther: demographics.gender.other + demographics.gender.unknown,
    activeMinistries: "N/D",
  };
}
