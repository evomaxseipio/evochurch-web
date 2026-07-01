import { signOut } from "@/app/(auth)/login/actions";

export function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2 lg:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </form>
    </header>
  );
}
