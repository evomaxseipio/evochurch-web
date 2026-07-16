"use client";

import type { SelectOption } from "@/lib/members/catalogs";
import type { ReactNode } from "react";

export function DrawerSectionCard({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
        }}
      >
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
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

export function DrawerField({
  label,
  name,
  required,
  type = "text",
  options,
  placeholder,
  span = 1,
  defaultValue,
  value,
  onChange,
  rows = 3,
  error,
}: {
  label: string;
  name?: string;
  required?: boolean;
  type?: string;
  options?: readonly SelectOption[] | readonly string[];
  placeholder?: string;
  span?: number;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  error?: string;
}) {
  const selectOptions: SelectOption[] = options
    ? options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o,
      )
    : [];

  const inputId = name ?? label.replace(/\s+/g, "-").toLowerCase();
  const controlled = value !== undefined;
  const controlProps = controlled
    ? { value }
    : { defaultValue: defaultValue ?? "" };

  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      {label ? (
        <label htmlFor={inputId}>
          {label}
          {required ? (
            <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>
          ) : null}
        </label>
      ) : null}
      <div className={`input-wrap${error ? " error" : ""}`}>
        {type === "select" ? (
          <select
            id={inputId}
            name={name}
            {...controlProps}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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
            id={inputId}
            name={name}
            rows={rows}
            {...controlProps}
            placeholder={placeholder}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          />
        ) : (
          <input
            id={inputId}
            name={name}
            type={type}
            placeholder={placeholder}
            {...controlProps}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            required={required}
          />
        )}
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
