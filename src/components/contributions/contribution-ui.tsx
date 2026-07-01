import { Icons } from "@/components/icons";
import { initialsFromName } from "@/lib/contributions/parse";
import type { Contribution } from "@/lib/contributions/types";

/** Contribuyente — mismo layout que columna Miembro (avatar cuadrado + nombre) */
export function ContributorCell({ entry }: { entry: Contribution }) {
  const isCollective = entry.collectionMode === "collective";

  return (
    <div className="row" style={{ gap: 12, alignItems: "center" }}>
      {isCollective ? (
        <span
          className="avatar md sq"
          style={{
            display: "grid",
            placeItems: "center",
            background: "var(--surface-2)",
            color: "var(--ink-3)",
          }}
        >
          <Icons.users size={16} />
        </span>
      ) : (
        <span className="avatar md sq">
          {initialsFromName(entry.contributorLabel)}
        </span>
      )}
      <div style={{ fontWeight: 600, minWidth: 0 }}>{entry.contributorLabel}</div>
    </div>
  );
}
