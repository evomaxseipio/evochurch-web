"use client";

import { Icons } from "@/components/icons";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useTranslations("common");
  const selected = value ? "yes" : "no";

  return (
    <div className="yes-no-toggle">
      {(["yes", "no"] as const).map((val) => {
        const isYes = val === "yes";
        const isSelected = selected === val;
        return (
          <button
            key={val}
            type="button"
            className={`yes-no-option${isSelected ? " is-selected" : ""}${isYes ? " is-yes" : " is-no"}`}
            aria-pressed={isSelected}
            onClick={() => onChange(isYes)}
          >
            {isYes ? <Icons.check size={12} /> : <Icons.x size={12} />}
            {isYes ? t("yes") : t("no")}
          </button>
        );
      })}
    </div>
  );
}

export function YesNoField({
  label,
  name,
  defaultValue = false,
  value: controlledValue,
  onChange,
  inline = false,
}: {
  label?: string;
  name?: string;
  defaultValue?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
  inline?: boolean;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internal;

  const handleChange = (next: boolean) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const toggle = <YesNoToggle value={value} onChange={handleChange} />;

  if (!label) return toggle;

  if (inline) {
    return (
      <div className="field">
        <div className="row between" style={{ alignItems: "center" }}>
          <label style={{ margin: 0 }}>{label}</label>
          {toggle}
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ marginTop: 4 }}>{toggle}</div>
      {name ? (
        <input type="hidden" name={name} value={value ? "true" : "false"} />
      ) : null}
    </div>
  );
}
