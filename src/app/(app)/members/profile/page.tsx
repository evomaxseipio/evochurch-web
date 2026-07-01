import { MemberProfileShell } from "@/components/members/member-profile-shell";
import type { Member, MembershipRecord } from "@/lib/members/types";
import {
  fetchMemberById,
  fetchMemberRoles,
  fetchMembership,
} from "@/lib/services/members";
import { getAppSession } from "@/lib/auth/app-session";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type ProfileData =
  | { kind: "missing-id" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      member: Member;
      roles: string[];
      membership: MembershipRecord | null;
    };

async function loadProfileData(id: string | undefined): Promise<ProfileData> {
  if (!id) return { kind: "missing-id" };

  const supabase = await createClient();
  const session = await getAppSession();

  if (!session) return { kind: "error", message: "Sesión no válida." };

  try {
    const churchId = session.churchId;
    const [member, roles] = await Promise.all([
      fetchMemberById(supabase, churchId, id),
      fetchMemberRoles(supabase).catch(() => [] as string[]),
    ]);

    if (!member) return { kind: "not-found" };

    const membership = await fetchMembership(supabase, churchId, id).catch(
      () => null,
    );

    return {
      kind: "ok",
      member,
      roles,
      membership,
    };
  } catch (e) {
    return {
      kind: "error",
      message: e instanceof Error ? e.message : "Error al cargar el perfil.",
    };
  }
}

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const data = await loadProfileData(id);

  if (data.kind === "missing-id") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">
          ID de miembro no especificado.{" "}
          <Link href="/members" className="text-primary underline">
            Volver al listado
          </Link>
        </p>
      </div>
    );
  }

  if (data.kind === "not-found") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">
          No se encontró el miembro.{" "}
          <Link href="/members" className="text-primary underline">
            Volver al listado
          </Link>
        </p>
      </div>
    );
  }

  if (data.kind === "error") {
    return (
      <div className="p-6">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {data.message}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Cargando perfil…</div>}>
      <MemberProfileShell
        member={data.member}
        roles={data.roles}
        membership={data.membership}
      />
    </Suspense>
  );
}
