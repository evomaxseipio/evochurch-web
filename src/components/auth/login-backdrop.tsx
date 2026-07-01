/** Fondo continuo del login — un solo canvas, sin división entre columnas */
export function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="login-mesh absolute inset-0" />
      <div className="login-orb login-orb-a absolute -left-[20%] top-[10%] h-[55vh] w-[55vh] rounded-full" />
      <div className="login-orb login-orb-b absolute bottom-[5%] left-[30%] h-[45vh] w-[45vh] rounded-full" />
      <div className="login-orb login-orb-c absolute -right-[15%] top-[35%] h-[50vh] w-[50vh] rounded-full" />
      <div className="login-grain absolute inset-0 opacity-[0.35]" />
      <div className="login-vignette absolute inset-0" />
    </div>
  );
}
