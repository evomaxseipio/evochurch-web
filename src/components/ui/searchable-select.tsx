"use client";

import { Icons } from "@/components/icons";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyMessage = "Sin resultados",
  disabled = false,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.sublabel ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  const showSelectedLabel = Boolean(selected) && !open;
  const inputValue = open ? query : selected?.label ?? "";

  return (
    <div style={{ position: "relative" }}>
      <div
        className="input-wrap"
        style={{
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.65 : 1,
        }}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Icons.search size={14} stroke="var(--ink-3)" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            if (selected) setQuery("");
          }}
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            outline: 0,
            color: "inherit",
            font: "inherit",
            fontSize: 13,
          }}
        />
        {showSelectedLabel ? (
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            disabled={disabled}
            aria-label="Clear"
            style={{ width: 28, height: 28 }}
          >
            <Icons.x size={14} />
          </button>
        ) : (
          <Icons.arrowDn size={14} stroke="var(--ink-3)" />
        )}
      </div>

      {open && !disabled ? (
        <>
          <div
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            style={{ position: "fixed", inset: 0, zIndex: 50 }}
            aria-hidden
          />
          <div
            id={listId}
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 51,
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "var(--shadow-3)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {filtered.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={(event) => {
                    event.stopPropagation();
                    choose(option.value);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    background: isSelected ? "var(--accent-soft)" : "transparent",
                    border: 0,
                    borderBottom:
                      index < filtered.length - 1
                        ? "1px solid var(--hairline)"
                        : "none",
                    color: "inherit",
                    font: "inherit",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {option.label}
                    </div>
                    {option.sublabel ? (
                      <div className="tiny muted">{option.sublabel}</div>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <Icons.check size={14} stroke="var(--accent)" />
                  ) : null}
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <div
                style={{ padding: "20px 12px", textAlign: "center" }}
                className="muted tiny"
              >
                {emptyMessage}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
