"use client";

export function OrganizationsListSkeleton() {
  return (
    <div>
      <div className="bo-page-header">
        <div style={{ flex: 1 }}>
          <div className="bo-skeleton" style={{ width: 220, height: 28, marginBottom: 8 }} />
          <div className="bo-skeleton" style={{ width: 180, height: 16 }} />
        </div>
        <div className="bo-skeleton" style={{ width: 180, height: 36, borderRadius: 8 }} />
      </div>

      <div className="bo-toolbar">
        <div className="bo-skeleton" style={{ flex: 1, maxWidth: 360, height: 38 }} />
        <div className="bo-skeleton" style={{ width: 140, height: 38 }} />
        <div className="bo-skeleton" style={{ width: 140, height: 38 }} />
      </div>

      <div className="table-wrap">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bo-sk-row">
            <div className="bo-skeleton tall" />
            <div className="bo-skeleton" />
            <div className="bo-skeleton tall" />
            <div className="bo-skeleton" style={{ width: 90, borderRadius: 999 }} />
            <div className="bo-skeleton tall" />
            <div className="bo-skeleton" />
            <div className="bo-skeleton tall" />
            <div className="bo-skeleton" style={{ width: 28, height: 28, borderRadius: 999 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
