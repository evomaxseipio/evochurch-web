"use client";

import { Icons } from "@/components/icons";
import type { PendingAuthorizationItem } from "@/lib/dashboard/types";
import { fmtRD } from "@/lib/format-currency";
import { formatMovementDateShort } from "@/lib/ledger/parse";
import Link from "next/link";
import { useMemo, useState } from "react";

function itemMeta(item: PendingAuthorizationItem): string {
  const date = formatMovementDateShort(item.movementDate);
  const base = item.subtitle.split(" · ")[0]?.trim() || item.subtitle;
  return `${base} · ${date}`;
}

function PendingRow({
  item,
  href,
}: {
  item: PendingAuthorizationItem;
  href: string;
}) {
  const [hover, setHover] = useState(false);
  const isTransfer = item.kind === "fund_transfer";

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 12px",
        margin: "0 -12px",
        borderRadius: 14,
        textDecoration: "none",
        color: "inherit",
        transition: "background 0.18s ease, box-shadow 0.18s ease",
        background: hover
          ? "color-mix(in oklab, var(--warm) 6%, var(--surface-2))"
          : "transparent",
        boxShadow: hover ? "inset 0 0 0 1px var(--hairline)" : "none",
      }}
    >
      <span
        className="avatar sq lg"
        style={{
          flexShrink: 0,
          background: isTransfer
            ? "color-mix(in oklab, var(--accent) 14%, transparent)"
            : "color-mix(in oklab, var(--danger) 12%, transparent)",
          color: isTransfer ? "var(--accent)" : "var(--danger)",
          border: `1px solid ${
            isTransfer
              ? "color-mix(in oklab, var(--accent) 22%, transparent)"
              : "color-mix(in oklab, var(--danger) 20%, transparent)"
          }`,
        }}
      >
        {isTransfer ? (
          <Icons.wallet size={18} />
        ) : (
          <Icons.arrowDn width={18} height={18} />
        )}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--ink)",
          }}
        >
          {item.title}
        </div>
        <div
          className="row"
          style={{ gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}
        >
          <span className="tiny muted">{itemMeta(item)}</span>
          <span className="chip warn" style={{ padding: "2px 8px", fontSize: 10 }}>
            <span className="pip" />
            Pendiente
          </span>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 88 }}>
        <div
          className="tnum mono"
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: isTransfer ? "var(--accent)" : "var(--danger)",
            letterSpacing: "-0.02em",
          }}
        >
          −{fmtRD(item.amount)}
        </div>
      </div>
    </Link>
  );
}

/** Listado de transacciones pendientes (span-4). */
export function PendingTransactionsList({
  items,
}: {
  items: PendingAuthorizationItem[];
}) {
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );
  const visible = items.slice(0, 5);

  return (
    <div className="card span-4" style={{ display: "flex", flexDirection: "column" }}>
      <div className="row between" style={{ marginBottom: 16, gap: 10 }}>
        <div>
          <div className="eyebrow">Transacciones</div>
          <div className="row" style={{ gap: 10, marginTop: 4, alignItems: "baseline" }}>
            <div className="display" style={{ fontSize: 22 }}>
              Pendientes
            </div>
            {items.length > 0 ? (
              <span className="chip warn">
                <span className="pip" />
                {items.length}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/finances/transactions"
          className="tiny"
          style={{
            color: "var(--primary)",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Ver todo →
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: "32px 16px",
            borderRadius: 14,
            background:
              "linear-gradient(180deg, var(--surface-2) 0%, color-mix(in oklab, var(--surface-2) 50%, transparent) 100%)",
            border: "1px dashed var(--hairline)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <span
              className="avatar sq lg"
              style={{
                margin: "0 auto 12px",
                background: "var(--success-bg)",
                color: "var(--success)",
              }}
            >
              <Icons.check size={20} />
            </span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Todo al día</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              No hay egresos por autorizar
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className="row between"
            style={{
              padding: "12px 14px",
              marginBottom: 8,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--warm) 10%, var(--surface-2)), var(--surface-2))",
              border: "1px solid color-mix(in oklab, var(--warm) 18%, var(--hairline))",
            }}
          >
            <div>
              <div className="tiny muted" style={{ letterSpacing: "0.06em" }}>
                TOTAL EN COLA
              </div>
              <div
                className="tnum mono"
                style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: "var(--ink)" }}
              >
                {fmtRD(totalAmount)}
              </div>
            </div>
            <span
              className="chip warm"
              style={{ alignSelf: "center", whiteSpace: "nowrap" }}
            >
              Requiere revisión
            </span>
          </div>

          <div className="col" style={{ gap: 2 }}>
            {visible.map((item, index) => (
              <div key={item.id}>
                <PendingRow item={item} href="/finances/transactions" />
                {index < visible.length - 1 ? (
                  <div
                    style={{
                      height: 1,
                      background: "var(--hairline)",
                      margin: "0 12px",
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>

          {items.length > visible.length ? (
            <Link
              href="/finances/transactions"
              className="tiny"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--hairline)",
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              +{items.length - visible.length} más en transacciones
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
