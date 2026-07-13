"use client";

import { MemberCombobox } from "@/components/ministries/member-combobox";
import { Icons } from "@/components/icons";
import { GUARDIAN_RELATIONSHIPS, type ChildGuardianInput } from "@/lib/children/types";
import { memberFullName } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
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

  function addGuardian(ids: string[]) {
    const existing = new Set(guardians.map((g) => g.guardianProfileId));
    const kept = guardians.filter((g) => ids.includes(g.guardianProfileId));
    const added = ids.filter((id) => !existing.has(id));
    const next = [
      ...kept,
      ...added.map((guardianProfileId) => ({
        guardianProfileId,
        relationship: "guardian" as const,
        isPrimary: kept.length === 0 && added[0] === guardianProfileId,
      })),
    ];
    if (!next.some((g) => g.isPrimary) && next.length > 0) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  function setPrimary(index: number) {
    onChange(guardians.map((row, i) => ({ ...row, isPrimary: i === index })));
  }

  return (
    <div className="col gap-md">
      {guardians.map((row, index) => {
        const member = adultMembers.find((m) => m.memberId === row.guardianProfileId);
        const name = member ? memberFullName(member) : row.guardianProfileId;

        return (
          <div
            key={`${row.guardianProfileId}-${index}`}
            className="row"
            style={{
              gap: 10,
              alignItems: "flex-end",
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--bg-2)",
              border: "1px solid var(--hairline)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{name}</div>
              <div className="mf-grid" style={{ gridTemplateColumns: "1fr auto" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="tiny">{t("relationshipLabel")}</label>
                  <div className="input-wrap">
                    <select
                      value={row.relationship}
                      onChange={(e) =>
                        updateRow(index, {
                          relationship: e.target.value as ChildGuardianInput["relationship"],
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
                <label className="row tiny" style={{ gap: 6, cursor: "pointer", paddingBottom: 8 }}>
                  <input
                    type="radio"
                    name="primaryGuardian"
                    checked={row.isPrimary}
                    onChange={() => setPrimary(index)}
                  />
                  {t("primaryGuardian")}
                </label>
              </div>
            </div>
            <button
              type="button"
              className="btn ghost icon-only"
              onClick={() => removeRow(index)}
              aria-label={t("removeGuardian")}
            >
              <Icons.x size={16} />
            </button>
          </div>
        );
      })}

      <MemberCombobox
        selectedIds={selectedIds}
        members={adultMembers}
        onChange={addGuardian}
        placeholderEmpty={t("searchGuardian")}
        placeholderSelected={(count) => t("guardiansSelected", { count })}
      />
    </div>
  );
}
