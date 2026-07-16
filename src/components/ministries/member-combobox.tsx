"use client";

import { Icons } from "@/components/icons";
import { memberFullName, memberInitials } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

function foldQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function matchesPerson(member: Member, query: string): boolean {
  const q = foldQuery(query);
  if (!q) return true;
  const haystack = foldQuery(
    [
      memberFullName(member),
      member.nickName,
      member.membershipRole,
      member.contact.email,
      member.contact.mobilePhone,
      member.contact.phone,
    ].join(" "),
  );
  return haystack.includes(q);
}

export function MemberCombobox({
  selectedIds,
  members,
  onChange,
  placeholderEmpty = "Buscar miembros…",
  placeholderSelected,
  adultsOnly = false,
}: {
  selectedIds: string[];
  members: Member[];
  onChange: (ids: string[]) => void;
  placeholderEmpty?: string;
  placeholderSelected?: (count: number) => string;
  /** When true, hides children (e.g. ministry leaders). */
  adultsOnly?: boolean;
}) {
  const t = useTranslations("ministerios");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    width: 0,
    zIndex: 1200,
  });

  const catalog = useMemo(
    () =>
      adultsOnly
        ? members.filter((member) => member.isChild !== true)
        : members,
    [adultsOnly, members],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return catalog;
    return catalog.filter((member) => matchesPerson(member, q));
  }, [catalog, query]);

  const selected = catalog.filter((member) =>
    selectedIds.includes(member.memberId),
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  };

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
      const width = rect.width;

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
        maxHeight: 220,
        overflowY: "auto",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        boxShadow: "var(--shadow-3)",
      });
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, filtered.length]);

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
    <div ref={rootRef} style={{ position: "relative" }}>
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
              {member.isChild ? (
                <span style={{ opacity: 0.75, fontSize: 10 }}>
                  {t("childBadge")}
                </span>
              ) : null}
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
            style={{ position: "fixed", inset: 0, zIndex: 1190 }}
            aria-hidden
          />
          <div style={menuStyle} role="listbox">
            {filtered.map((member, index) => {
              const isSelected = selectedIds.includes(member.memberId);
              return (
                <div
                  key={member.memberId}
                  role="option"
                  aria-selected={isSelected}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {memberFullName(member)}
                    </div>
                    <div className="tiny muted">
                      {member.isChild
                        ? t("childBadge")
                        : member.membershipRole || t("memberFallbackRole")}
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
                {t("noPeopleMatchSearch")}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
