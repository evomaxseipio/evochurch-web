"use client";

import { Icons } from "@/components/icons";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { GUARDIAN_RELATIONSHIPS, type ChildGuardianInput } from "@/lib/children/types";
import { memberFullName, memberInitials } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

export function GuardianEditor({
  guardians,
  adultMembers,
  onChange,
}: {
  guardians: ChildGuardianInput[];
  adultMembers: Member[];
  onChange: (next: ChildGuardianInput[]) => void;
}) {
  const t = useTranslations("children");
  const selectedIds = guardians.map((g) => g.guardianProfileId);
  const showPrimaryToggle = guardians.length > 1;

  const adultOptions = useMemo(
    () =>
      adultMembers
        .filter((member) => !selectedIds.includes(member.memberId))
        .map((member) => ({
          value: member.memberId,
          label: memberFullName(member),
          sublabel: member.membershipRole || undefined,
        })),
    [adultMembers, selectedIds],
  );

  function updateRow(index: number, patch: Partial<ChildGuardianInput>) {
    onChange(guardians.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    const next = guardians.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((g) => g.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  function addGuardian(guardianProfileId: string) {
    if (!guardianProfileId || selectedIds.includes(guardianProfileId)) return;
    const next = [
      ...guardians,
      {
        guardianProfileId,
        relationship: "guardian" as const,
        isPrimary: guardians.length === 0,
      },
    ];
    if (!next.some((g) => g.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  function setPrimary(index: number) {
    onChange(guardians.map((row, i) => ({ ...row, isPrimary: i === index })));
  }

  return (
    <div className="guardian-editor col gap-sm">
      <SearchableSelect
        options={adultOptions}
        value=""
        onChange={addGuardian}
        placeholder={t("searchGuardian")}
        emptyMessage={t("noAdultMatches")}
        clearable={false}
        ariaLabel={t("searchGuardian")}
      />

      {guardians.length === 0 ? (
        <p className="tiny muted" style={{ margin: 0 }}>
          {t("noGuardians")}
        </p>
      ) : (
        <div className="col gap-sm">
          {guardians.map((row, index) => {
            const member = adultMembers.find((m) => m.memberId === row.guardianProfileId);
            const name = member ? memberFullName(member) : row.guardianProfileId;
            const initials = member
              ? memberInitials(member)
              : name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("") || "?";
            const role = member?.membershipRole?.trim() || null;

            return (
              <div key={`${row.guardianProfileId}-${index}`} className="guardian-card">
                <div className="guardian-card-head">
                  <span className="avatar sm" aria-hidden>
                    {initials}
                  </span>
                  <div className="guardian-card-meta">
                    <div className="guardian-card-name">{name}</div>
                    {role ? <div className="tiny muted">{role}</div> : null}
                  </div>
                  {row.isPrimary && !showPrimaryToggle ? (
                    <span className="guardian-primary-chip">{t("primaryGuardian")}</span>
                  ) : null}
                  <button
                    type="button"
                    className="btn ghost icon-only guardian-card-remove"
                    onClick={() => removeRow(index)}
                    aria-label={t("removeGuardian")}
                  >
                    <Icons.x size={16} />
                  </button>
                </div>

                <div className="guardian-card-body">
                  <div className="field" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                    <label className="tiny" htmlFor={`guardian-rel-${row.guardianProfileId}`}>
                      {t("relationshipLabel")}
                    </label>
                    <div className="input-wrap">
                      <select
                        id={`guardian-rel-${row.guardianProfileId}`}
                        value={row.relationship}
                        onChange={(e) =>
                          updateRow(index, {
                            relationship: e.target
                              .value as ChildGuardianInput["relationship"],
                          })
                        }
                      >
                        {GUARDIAN_RELATIONSHIPS.map((rel) => (
                          <option key={rel} value={rel}>
                            {t(`relationship.${rel}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showPrimaryToggle ? (
                    <button
                      type="button"
                      className={`guardian-primary-toggle${row.isPrimary ? " is-active" : ""}`}
                      onClick={() => setPrimary(index)}
                      aria-pressed={row.isPrimary}
                    >
                      {t("primaryGuardian")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
