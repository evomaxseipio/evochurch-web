"use client";

import type { SelectOption } from "@/lib/members/catalogs";
import type { Member } from "@/lib/members/types";
import { Icons } from "@/components/icons";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function ProfileSectionCard({
  eyebrow,
  title,
  sub,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginTop: eyebrow ? 3 : 0,
              color: "var(--fg)",
            }}
          >
            {title}
          </div>
          {sub ? (
            <div className="tiny muted" style={{ marginTop: 4, maxWidth: 580 }}>
              {sub}
            </div>
          ) : null}
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

export function ProfileField({
  label,
  name,
  required,
  type = "text",
  options,
  placeholder,
  span = 1,
  defaultValue,
  embedded = false,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  options?: readonly SelectOption[] | readonly string[];
  placeholder?: string;
  span?: number;
  defaultValue?: string;
  embedded?: boolean;
}) {
  const selectOptions: SelectOption[] = options
    ? options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o,
      )
    : [];

  return (
    <div
      className="field"
      style={embedded ? undefined : { gridColumn: `span ${span}` }}
    >
      <label htmlFor={name}>
        {label}
        {required ? (
          <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>
        ) : null}
      </label>
      <div className="input-wrap">
        {type === "select" ? (
          <select
            id={name}
            name={name}
            defaultValue={defaultValue ?? ""}
            required={required}
          >
            {selectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            id={name}
            name={name}
            rows={3}
            defaultValue={defaultValue}
            placeholder={placeholder}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            defaultValue={defaultValue}
            placeholder={placeholder}
            required={required}
          />
        )}
      </div>
    </div>
  );
}

const MEMBERSHIP_STATUSES = ["Activo", "Inactivo"] as const;

function membershipStatusFromMember(member: Member): (typeof MEMBERSHIP_STATUSES)[number] {
  return member.isActive ? "Activo" : "Inactivo";
}

function memberFlagsFromMembershipStatus(status: (typeof MEMBERSHIP_STATUSES)[number]) {
  if (status === "Activo") return { isActive: "true", isMember: "true" };
  return { isActive: "false", isMember: "false" };
}

/** Pills Activo / Inactivo (mismo estilo que credencial y bautismo en el Espíritu). */
export function MembershipStatusField({ member }: { member: Member }) {
  const t = useTranslations("members");
  const [status, setStatus] = useState(() => membershipStatusFromMember(member));
  const flags = memberFlagsFromMembershipStatus(status);

  return (
    <div className="field">
      <label>{t("membershipStatus")}</label>
      <div
        className="row"
        style={{
          gap: 4,
          padding: 3,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          width: "fit-content",
          marginTop: 4,
        }}
      >
        {MEMBERSHIP_STATUSES.map((label) => {
          const active = status === label;
          const isActiveOption = label === "Activo";
          return (
            <button
              key={label}
              type="button"
              className="btn xs"
              onClick={() => setStatus(label)}
              style={{
                borderRadius: 999,
                padding: "4px 14px",
                minWidth: 56,
                background: active
                  ? isActiveOption
                    ? "var(--green)"
                    : "var(--bg-3)"
                  : "transparent",
                color: active
                  ? isActiveOption
                    ? "#052113"
                    : "var(--fg)"
                  : "var(--muted)",
                borderColor: "transparent",
                fontWeight: 600,
              }}
            >
              {isActiveOption && active ? <Icons.check size={12} /> : null}
              {!isActiveOption && active ? <Icons.x size={12} /> : null}
              {label === "Activo" ? t("statusActive") : t("statusInactive")}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="isActive" value={flags.isActive} />
      <input type="hidden" name="isMember" value={flags.isMember} />
    </div>
  );
}

export function YesNoField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: boolean;
}) {
  const t = useTranslations("common");
  const [value, setValue] = useState(defaultValue ? "yes" : "no");

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className="row"
        style={{
          gap: 4,
          padding: 3,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          width: "fit-content",
          marginTop: 4,
        }}
      >
        {(
          [
            ["yes", "Sí"],
            ["no", "No"],
          ] as const
        ).map(([val]) => (
          <button
            key={val}
            type="button"
            className="btn xs"
            onClick={() => setValue(val)}
            style={{
              borderRadius: 999,
              padding: "4px 14px",
              minWidth: 56,
              background:
                value === val
                  ? val === "yes"
                    ? "var(--green)"
                    : "var(--bg-3)"
                  : "transparent",
              color:
                value === val
                  ? val === "yes"
                    ? "#052113"
                    : "var(--fg)"
                  : "var(--muted)",
              borderColor: "transparent",
              fontWeight: 600,
            }}
          >
            {val === "yes" ? <Icons.check size={12} /> : <Icons.x size={12} />}
            {val === "yes" ? t("yes") : t("no")}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value === "yes" ? "true" : "false"} />
    </div>
  );
}
