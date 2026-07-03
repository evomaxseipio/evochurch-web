"use client";

import { Icons } from "@/components/icons";
import Link from "next/link";

export const PROFILE_FORM_ID = "member-profile-form";
export const MEMBERSHIP_FORM_ID = "member-membership-form";

export type ProfileTabId = "profile" | "membership" | "finances" | "delete";

export function MemberProfileToolbar({
  tab,
  profilePending,
  membershipPending,
  canWriteMembers,
}: {
  tab: ProfileTabId;
  profilePending: boolean;
  membershipPending: boolean;
  canWriteMembers: boolean;
}) {
  const pending = tab === "profile" ? profilePending : membershipPending;
  const formId =
    tab === "profile"
      ? PROFILE_FORM_ID
      : tab === "membership"
        ? MEMBERSHIP_FORM_ID
        : null;

  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      <Link href="/members" className="btn outline sm">
        <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>
          <Icons.arrowDn size={12} />
        </span>
        Volver al listado
      </Link>
      <button
        type="button"
        className="btn outline"
        onClick={() => window.print()}
      >
        <Icons.download size={14} /> Imprimir
      </button>
      {formId && canWriteMembers ? (
        <button
          type="submit"
          form={formId}
          disabled={pending}
          className="btn primary"
        >
          <Icons.check size={16} />
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      ) : null}
    </div>
  );
}
