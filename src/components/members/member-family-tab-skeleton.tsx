export function MemberFamilyTabSkeleton() {
  return (
    <div className="profile-section-stack animate-pulse" aria-busy="true">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
          <div
            style={{
              width: 72,
              height: 10,
              borderRadius: 4,
              marginBottom: 10,
              background: "var(--bg-2)",
            }}
          />
          <div
            style={{
              width: "42%",
              height: 20,
              borderRadius: 6,
              background: "var(--bg-2)",
            }}
          />
        </div>
        <div style={{ padding: "16px 18px" }}>
          <div
            style={{
              width: "100%",
              height: 56,
              borderRadius: 12,
              background: "var(--bg-2)",
            }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="row between"
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--line)",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: 120,
                height: 10,
                borderRadius: 4,
                marginBottom: 10,
                background: "var(--bg-2)",
              }}
            />
            <div
              style={{
                width: "55%",
                height: 20,
                borderRadius: 6,
                background: "var(--bg-2)",
              }}
            />
          </div>
          <div
            style={{
              width: 120,
              height: 32,
              borderRadius: 8,
              flexShrink: 0,
              background: "var(--bg-2)",
            }}
          />
        </div>
        <div style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
          <div
            style={{
              width: "100%",
              height: 64,
              borderRadius: 12,
              background: "var(--bg-2)",
            }}
          />
          <div
            style={{
              width: "100%",
              height: 64,
              borderRadius: 12,
              background: "var(--bg-2)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
