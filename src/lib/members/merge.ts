import {
  normalizeGender,
  normalizeIdType,
  normalizeMaritalStatus,
} from "@/lib/members/catalogs";
import type { Member, MemberProfileInput } from "@/lib/members/types";

/** Aplica los valores del formulario al miembro en memoria (mientras llega el refetch). */
export function mergeMemberFromInput(
  member: Member,
  input: MemberProfileInput,
): Member {
  return {
    ...member,
    firstName: input.firstName,
    lastName: input.lastName,
    nickName: input.nickName,
    dateOfBirth: input.dateOfBirth,
    gender: normalizeGender(input.gender),
    maritalStatus: normalizeMaritalStatus(input.maritalStatus),
    nationality: input.nationality,
    idType: normalizeIdType(input.idType),
    idNumber: input.idNumber,
    isActive: input.isActive,
    isMember: input.isMember,
    bio: input.bio,
    membershipRoleId: input.membershipRoleId,
    membershipRole: input.membershipRole,
    address: {
      streetAddress: input.streetAddress,
      stateProvince: input.stateProvince,
      cityState: input.cityState,
      country: input.country,
    },
    contact: {
      phone: input.phone,
      mobilePhone: input.mobilePhone,
      email: input.email,
    },
  };
}
