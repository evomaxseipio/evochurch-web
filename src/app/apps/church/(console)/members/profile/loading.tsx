export default function MemberProfileLoading() {
  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="animate-pulse space-y-5">
        <div className="h-24 rounded-2xl bg-surface" />
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <div className="hidden h-64 rounded-2xl bg-surface lg:block" />
          <div className="space-y-4">
            <div className="h-10 rounded-xl bg-surface" />
            <div className="h-72 rounded-2xl bg-surface" />
            <div className="h-48 rounded-2xl bg-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}
