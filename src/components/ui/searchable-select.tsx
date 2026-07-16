"use client";

import { Icons } from "@/components/icons";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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
  /** Trigger compacto para toolbars (no duplica el look de search box). */
  compact = false,
  clearable = true,
  ariaLabel,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  compact?: boolean;
  clearable?: boolean;
  ariaLabel?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    width: 0,
    zIndex: 1200,
  });

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

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    function placeMenu() {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const estimatedHeight = Math.min(280, 48 + filtered.length * 44);
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      const width = Math.max(rect.width, compact ? 220 : rect.width);

      setMenuStyle({
        position: "fixed",
        top: openUp
          ? Math.max(viewportPadding, rect.top - estimatedHeight - 4)
          : rect.bottom + 4,
        left: Math.min(
          rect.left,
          Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
        ),
        width,
        zIndex: 1200,
      });
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, compact, filtered.length]);

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

  useEffect(() => {
    if (!open || !compact) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, compact]);

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

  function close() {
    setOpen(false);
    setQuery("");
  }

  const showClear =
    clearable && Boolean(selected) && selected?.value !== "" && !open;
  const triggerLabel = selected?.label ?? placeholder;

  const dropdown = open && !disabled ? (
    <>
      <div
        onClick={close}
        style={{ position: "fixed", inset: 0, zIndex: 1190 }}
        aria-hidden
      />
      <div
        id={listId}
        role="listbox"
        style={{
          ...menuStyle,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          boxShadow: "var(--shadow-3)",
          maxHeight: 280,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {compact ? (
          <div
            className="input-wrap"
            style={{
              margin: 8,
              flexShrink: 0,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <Icons.search size={14} stroke="var(--ink-3)" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
          </div>
        ) : null}
        <div style={{ overflowY: "auto", maxHeight: 220 }}>
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
      </div>
    </>
  ) : null;

  if (compact) {
    return (
      <div ref={rootRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="btn sm"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
            setQuery("");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minWidth: 168,
            maxWidth: 220,
            height: 36,
            padding: "0 10px 0 12px",
            background: open ? "var(--surface)" : "var(--surface-2)",
            color: selected ? "var(--ink)" : "var(--ink-3)",
            boxShadow: open ? "var(--shadow-1)" : "none",
            fontWeight: 500,
            borderRadius: 10,
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "left",
            }}
          >
            {triggerLabel}
          </span>
          <Icons.arrowDn size={14} stroke="var(--ink-3)" />
        </button>
        {dropdown}
      </div>
    );
  }

  const showSelectedLabel = Boolean(selected) && !open;
  const inputValue = open ? query : selected?.label ?? "";

  return (
    <div ref={rootRef} className="field searchable-select" style={{ margin: 0, position: "relative" }}>
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
        <Icons.search size={14} stroke="var(--ink-3)" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            // Clear selection only when the user starts typing a new query.
            if (value && next.trim()) onChange("");
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            if (selected) setQuery("");
          }}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: 0,
            outline: 0,
            color: "inherit",
            font: "inherit",
            fontSize: 13,
          }}
        />
        {showClear && showSelectedLabel ? (
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            disabled={disabled}
            aria-label="Clear"
            style={{ width: 28, height: 28, flexShrink: 0 }}
          >
            <Icons.x size={14} />
          </button>
        ) : (
          <span style={{ display: "inline-flex", flexShrink: 0 }}>
            <Icons.arrowDn size={14} stroke="var(--ink-3)" />
          </span>
        )}
      </div>
      {dropdown}
    </div>
  );
}
