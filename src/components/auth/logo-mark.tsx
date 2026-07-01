export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[14px] text-white shadow-lg"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 60%, #34d399 200%)",
        boxShadow:
          "0 8px 24px -8px color-mix(in oklab, var(--primary) 50%, transparent)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.46}
        height={size * 0.46}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M12 3v18M6 9h12" />
      </svg>
    </div>
  );
}
