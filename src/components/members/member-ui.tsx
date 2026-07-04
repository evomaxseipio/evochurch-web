"use client";

import type { SelectOption } from "@/lib/members/catalogs";
import type { Member } from "@/lib/members/types";
import { memberInitials } from "@/lib/members/parse";
import { useTranslations } from "next-intl";

export function MemberAvatar({
  member,
  size = "md",
  square = false,
  ring: _ring = false,
}: {
  member: Member;
  size?: "sm" | "md" | "lg" | "xl";
  square?: boolean;
  ring?: boolean;
}) {
  return (
    <span className={`avatar ${size}${square ? " sq" : ""}`}>
      {memberInitials(member)}
    </span>
  );
}

export function StatusChip({ member }: { member: Member }) {
  const t = useTranslations("members");
  const label = member.isActive
    ? member.isMember
      ? t("statusActive")
      : t("statusVisit")
    : t("statusInactive");
  const chipClass =
    member.isActive && member.isMember
      ? "success"
      : member.isActive && !member.isMember
        ? "warn"
        : !member.isActive
          ? ""
          : "pending";

  return (
    <span className={`chip ${chipClass}`.trim()}>
      <span className="pip" /> {label}
    </span>
  );
}

export function RoleChip({ role }: { role: string }) {
  if (!role) return <span className="muted">—</span>;
  return <span className="chip violet">{role}</span>;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  span2,
  span3,
  options,
  optionItems,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  span2?: boolean;
  span3?: boolean;
  /** @deprecated Usar optionItems (value en inglés, label en español). */
  options?: string[];
  optionItems?: readonly SelectOption[];
}) {
  const t = useTranslations("common");
  const selectOptions: readonly SelectOption[] =
    optionItems ??
    (options?.map((o) => ({ value: o, label: o })) ?? []);
  const spanClass = span3
    ? "sm:col-span-2 lg:col-span-3"
    : span2
      ? "sm:col-span-2"
      : "";

  return (
    <label className={`block text-sm ${spanClass}`}>
      <span className="font-medium text-foreground">{label}</span>
      {selectOptions.length > 0 ? (
        <select
          key={`${name}-${defaultValue ?? ""}`}
          name={name}
          defaultValue={defaultValue ?? ""}
          className={inputClass}
        >
          <option value="">{t("selectOption")}</option>
          {selectOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          key={`${name}-${defaultValue ?? ""}`}
          name={name}
          rows={3}
          defaultValue={defaultValue}
          className={inputClass}
        />
      ) : (
        <input
          key={`${name}-${defaultValue ?? ""}`}
          type={type}
          name={name}
          defaultValue={defaultValue}
          required={required}
          className={inputClass}
        />
      )}
    </label>
  );
}

export function SectionCard({
  title,
  subtitle,
  eyebrow,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
