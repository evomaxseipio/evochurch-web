export function LoginPillars({
  pillars,
  className = "",
}: {
  pillars: readonly { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-6 border-t border-white/10 pt-8 sm:gap-10 ${className}`}
      role="list"
    >
      {pillars.map((p) => (
        <Pillar key={p.label} value={p.value} label={p.label} />
      ))}
    </div>
  );
}

function Pillar({ value, label }: { value: string; label: string }) {
  return (
    <div className="login-pillar" role="listitem">
      <p className="login-pillar-value">{value}</p>
      <p className="login-pillar-label">{label}</p>
    </div>
  );
}
