import { appRoleChipClass } from "@/lib/admin-users/roles";
import type { AdminUserRow } from "@/lib/admin-users/types";
import { churchAuthUserInitials } from "@/lib/admin-users/parse";
import { useTranslations } from "next-intl";

export function AdminUserAvatar({ row }: { row: AdminUserRow }) {
  const initials =
    ((row.firstName?.[0] || "") + (row.lastName?.[0] || "")).toUpperCase() ||
    "??";
  const bg = `linear-gradient(135deg, hsl(${(initials.charCodeAt(0) * 17) % 360} 50% 45%), hsl(${(initials.charCodeAt(1 % initials.length) * 23) % 360} 60% 35%))`;

  return (
    <span className="avatar md" style={{ background: bg }}>
      {initials}
    </span>
  );
}

export function AdminUserStatusChip({ active }: { active: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <span className={`chip ${active ? "green" : ""}`.trim()}>
      <span className="pip" /> {active ? tCommon("active") : tCommon("inactive")}
    </span>
  );
}

export function AdminUserRoleChip({ role }: { role: string }) {
  const chipClass = appRoleChipClass(role);
  return <span className={`chip ${chipClass}`}>{role}</span>;
}

export { churchAuthUserInitials };
