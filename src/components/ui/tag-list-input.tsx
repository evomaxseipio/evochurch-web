"use client";

import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export function TagListInput({
  name,
  label,
  hint,
  defaultValue = [],
  disabled = false,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("members");
  const inputId = useId();
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const parts = raw
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setTags((prev) => {
      const next = [...prev];
      for (const part of parts) {
        const lower = part.toLowerCase();
        if (!next.some((t) => t.toLowerCase() === lower)) {
          next.push(part);
        }
      }
      return next;
    });
    setDraft("");
  }

  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label htmlFor={inputId}>{label}</label>
      {hint ? (
        <div className="tiny muted" style={{ marginBottom: 8 }}>
          {hint}
        </div>
      ) : null}

      <input type="hidden" name={name} value={JSON.stringify(tags)} readOnly />

      <div
        className="input-wrap"
        style={{
          minHeight: 44,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          padding: "6px 10px",
        }}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="chip violet"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {tag}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeTag(index)}
                aria-label={t("removeTag", { tag })}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icons.x size={12} />
              </button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <input
            id={inputId}
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
            style={{
              border: 0,
              outline: "none",
              background: "transparent",
              flex: 1,
              minWidth: 120,
              fontSize: 14,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
