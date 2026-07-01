import type { CSSProperties } from "react";

/** Texto truncado en celdas de tabla; detalle completo en tooltip nativo (`title`). */
export function TruncatedTooltip({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!text) return null;

  return (
    <span
      className={`table-clip${className ? ` ${className}` : ""}`}
      title={text}
      style={style}
    >
      {text}
    </span>
  );
}
