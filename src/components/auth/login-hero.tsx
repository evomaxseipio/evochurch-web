import { LoginPillars } from "@/components/auth/login-pillars";

export function LoginHero() {
  return (
    <div className="relative flex flex-col justify-between px-8 py-12 lg:px-14 lg:py-16">
      <div className="login-fade-up">
        <p className="login-eyebrow">EvoChurch · administración</p>
        <h2 className="login-display mt-6 max-w-xl">
          Una sola plataforma para tu{" "}
          <span className="text-primary-light">ministerio</span>.
        </h2>
        <p className="login-lead mt-6 max-w-lg">
          Miembros, finanzas, eventos y comunicación — todo en un mismo lugar,
          con la confianza que tu congregación merece.
        </p>
      </div>

      <div className="login-fade-up login-fade-delay mt-14 hidden flex-col gap-10 lg:flex">
        <blockquote className="login-quote max-w-lg">
          &ldquo;Dios ama al dador alegre. Y poderoso es Dios para hacer que
          abunde en vosotros toda gracia.&rdquo;
        </blockquote>
        <p className="login-cite">— 2 Corintios 9:7-8</p>
        <LoginPillars />
      </div>
    </div>
  );
}
