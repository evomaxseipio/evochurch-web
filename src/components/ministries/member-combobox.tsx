"use client";

import { Icons } from "@/components/icons";
import { memberFullName, memberInitials } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import { useEffect, useRef, useState } from "react";

export function MemberCombobox({
  selectedIds,
  members,
  onChange,
  placeholderEmpty = "Buscar miembros…",
  placeholderSelected,
}: {
  selectedIds: string[];
  members: Member[];
  onChange: (ids: string[]) => void;
  placeholderEmpty?: string;
  placeholderSelected?: (count: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? members.filter((member) => {
        const name = memberFullName(member).toLowerCase();
        const role = (member.membershipRole ?? "").toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || role.includes(q);
      })
    : members;

  const selected = members.filter((member) =>
    selectedIds.includes(member.memberId),
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  };

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

  return (
    <div style={{ position: "relative" }}>
      {selected.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selected.map((member) => (
            <span
              key={member.memberId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px 2px 3px",
                borderRadius: 999,
                background: "var(--accent-soft)",
                border:
                  "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--accent)",
              }}
            >
              <span className="avatar sm">{memberInitials(member)}</span>
              <span style={{ marginLeft: 2 }}>
                {member.firstName || memberFullName(member).split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(member.memberId);
                }}
                aria-label={`Quitar ${memberFullName(member)}`}
                style={{
                  marginLeft: 4,
                  cursor: "pointer",
                  opacity: 0.6,
                  fontSize: 15,
                  lineHeight: 1,
                  border: 0,
                  background: "transparent",
                  color: "inherit",
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className="input-wrap"
        style={{ cursor: "text" }}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Icons.search size={14} stroke="var(--ink-3)" />
        <input
          ref={inputRef}
          placeholder={
            selected.length === 0
              ? placeholderEmpty
              : (placeholderSelected?.(selected.length) ??
                `${selected.length} seleccionado${selected.length !== 1 ? "s" : ""} · buscar más…`)
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
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
        <Icons.arrowDn size={14} stroke="var(--ink-3)" />
      </div>

      {open ? (
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
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {filtered.map((member, index) => {
              const isSelected = selectedIds.includes(member.memberId);
              return (
                <div
                  key={member.memberId}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(member.memberId);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    cursor: "pointer",
                    background: isSelected ? "var(--accent-soft)" : "transparent",
                    borderBottom:
                      index < filtered.length - 1
                        ? "1px solid var(--hairline)"
                        : "none",
                    transition: "background 0.1s",
                  }}
                >
                  <span className="avatar sm">{memberInitials(member)}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {memberFullName(member)}
                    </div>
                    <div className="tiny muted">
                      {member.membershipRole || "Miembro"}
                    </div>
                  </div>
                  {isSelected ? (
                    <Icons.check size={14} stroke="var(--accent)" />
                  ) : null}
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <div
                style={{ padding: "20px 12px", textAlign: "center" }}
                className="muted tiny"
              >
                Sin resultados
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
