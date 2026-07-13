"use client";

import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export function TagListInput({
  name,
  label,
  hint,
  defaultValue = [],
  value,
  onChange,
  disabled = false,
  placeholder,
  span,
  embedded = false,
}: {
  name: string;
  label?: string;
  hint?: string;
  defaultValue?: string[];
  value?: string[];
  onChange?: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Grid columns to span inside `.form-grid` (default: full row). */
  span?: number;
  /** When true, omits grid placement (for nested rows like blood type + allergies). */
  embedded?: boolean;
}) {
  const t = useTranslations("members");
  const inputId = useId();
  const [internalTags, setInternalTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const controlled = value != null && onChange != null;
  const tags = controlled ? value : internalTags;

  function commitTags(next: string[]) {
    if (controlled) onChange!(next);
    else setInternalTags(next);
  }

  function addTag(raw: string) {
    const parts = raw
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const next = [...tags];
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (!next.some((tag) => tag.toLowerCase() === lower)) {
        next.push(part);
      }
    }
    commitTags(next);
    setDraft("");
  }

  function removeTag(index: number) {
    commitTags(tags.filter((_, i) => i !== index));
  }

  return (
    <div
      className={`field tag-list-input${embedded ? " tag-list-input--embedded" : ""}`}
      style={
        embedded
          ? undefined
          : { gridColumn: span ? `span ${span}` : "1 / -1" }
      }
    >
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      {hint ? (
        <div className="tiny muted" style={{ marginBottom: 8 }}>
          {hint}
        </div>
      ) : null}

      <input type="hidden" name={name} value={JSON.stringify(tags)} readOnly />

      <div className="input-wrap tag-list-input__wrap">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="chip violet tag-list-input__chip"
          >
            {tag}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeTag(index)}
                aria-label={t("removeTag", { tag })}
                className="tag-list-input__chip-remove"
              >
                <Icons.x size={12} />
              </button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <input
            id={inputId}
            className="tag-list-input__text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(draft);
              } else if (e.key === "Backspace" && !draft && tags.length > 0) {
                removeTag(tags.length - 1);
              }
            }}
            onBlur={() => {
              if (draft.trim()) addTag(draft);
            }}
            placeholder={placeholder ?? t("tagInputPlaceholder")}
          />
        ) : null}
      </div>
    </div>
  );
}
