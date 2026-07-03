import { LoginForm } from "@/components/auth/login-form";
import { LoginPreview } from "@/components/auth/login-preview";
import { Icons } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
  const { next, error, email } = await searchParams;

  return (
    <div className="login">
      <div className="formside">
        <div className="login-brand">
          <div className="login-mark">
            <Icons.cross size={20} stroke="#fff" />
          </div>
          <div className="display" style={{ fontSize: 21, lineHeight: 1 }}>
            Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Church</em>
          </div>
        </div>
        <LoginForm
          next={next}
          email={email}
          loginError={error}
        />
      </div>

      <div className="visual">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <div className="promo">
          <h1>
            Administra tu ministerio
            <br />
            desde un solo lugar.
          </h1>
          <p className="sub">
            Inicia sesión para ver el panel de tu iglesia y gestionar miembros,
            finanzas y eventos.
          </p>
        </div>
        <LoginPreview />
      </div>
    </div>
  );
}
