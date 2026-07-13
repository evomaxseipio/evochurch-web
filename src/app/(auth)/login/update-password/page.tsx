import { CHURCH_DASHBOARD_PATH } from "@/lib/apps/church-routes";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { LoginPreview } from "@/components/auth/login-preview";
import { Icons } from "@/components/icons";
import { getAppSession } from "@/lib/auth/app-session";
import {
  sessionRequiresPasswordChange,
} from "@/lib/auth/temp-password-flow";
import { getVerifiedUser } from "@/lib/supabase/session";
import { redirect } from "next/navigation";

export default async function UpdatePasswordPage() {
  const user = await getVerifiedUser();
  if (!user) {
    redirect("/login");
  }

  const session = await getAppSession();
  if (!sessionRequiresPasswordChange(session)) {
    redirect(CHURCH_DASHBOARD_PATH);
  }

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
        <UpdatePasswordForm email={session?.email ?? user.email} />
      </div>

      <div className="visual">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <div className="promo">
          <h1>
            Un paso más
            <br />
            para entrar con seguridad.
          </h1>
          <p className="sub">
            Por tu seguridad, debes reemplazar la contraseña temporal antes de
            usar el panel de {session?.churchName ?? "tu iglesia"}.
          </p>
        </div>
        <LoginPreview />
      </div>
    </div>
  );
}
