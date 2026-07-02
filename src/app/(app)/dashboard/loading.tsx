export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-36 rounded-2xl bg-surface" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="h-72 rounded-2xl bg-surface lg:col-span-7" />
        <div className="h-72 rounded-2xl bg-surface lg:col-span-5" />
      </div>
    </div>
  );
}
