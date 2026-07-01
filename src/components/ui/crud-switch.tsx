"use client";

export function CrudSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        padding: 2,
        cursor: "pointer",
        background: on ? "var(--accent)" : "var(--line-2)",
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "#fff",
          transform: on ? "translateX(18px)" : "translateX(0)",
          transition: "transform 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}
