import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const Icons = {
  home: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  users: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21.5 18c0-2.3-2-4-4.5-4" />
    </svg>
  ),
  wallet: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1 0-4h13" />
      <circle cx="17" cy="14" r="1.2" fill="currentColor" />
    </svg>
  ),
  cal: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  chat: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.7-5A8 8 0 1 1 21 12z" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 2 5 2 7H4c0-2 2-3 2-7z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
  settings: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  arrowDn: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2 })}>
      <path d="M7 10l5 5 5-5" />
    </svg>
  ),
  arrowUp: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2 })}>
      <path d="M7 14l5-5 5 5" />
    </svg>
  ),
  arrowRight: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2 })}>
      <path d="M10 7l5 5-5 5" />
    </svg>
  ),
  download: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M12 3v13M7 12l5 5 5-5M5 21h14" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2 })}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M16 3l5 5-12 12H4v-5z" />
    </svg>
  ),
  trash: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    </svg>
  ),
  more: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width={p.size ?? 16} height={p.size ?? 16} fill="currentColor" {...p}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  ),
  menu: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2 })}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2.2 })}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  ),
  x: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base({ ...p, strokeWidth: 2 })}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  cross: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M12 3v18M6 9h12" />
    </svg>
  ),
  eye: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  moon: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  sun: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </svg>
  ),
  globe: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" />
    </svg>
  ),
  pin: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  trendUp: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  grid: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  list: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  star: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="m12 2 3.1 6.3L20 9.3l-5 4.9 1.2 6.9L12 17.8l-6.2 3.3 1.2-6.9-5-4.9 4.9-1L12 2z" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M12 2.5L4.5 5.5v5.8c0 4.6 3.2 8.9 7.5 9.7 4.3-.8 7.5-5.1 7.5-9.7V5.5L12 2.5z" />
      <path d="M12 8v4" />
      <path d="M10 10.5L12 13l2-2.5" />
    </svg>
  ),
  refresh: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M4 12a8 8 0 0113.6-5.6" />
      <path d="M4 4v4h4" />
      <path d="M20 12a8 8 0 01-13.6 5.6" />
      <path d="M20 20v-4h-4" />
    </svg>
  ),
  target: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  pendingActions: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14h6M9 18h4" />
    </svg>
  ),
  google: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width={p.size ?? 16} height={p.size ?? 16} {...p}>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h6c-.3 1.4-1.1 2.6-2.4 3.4v2.8h3.9c2.3-2.1 3.6-5.2 3.6-8.3z" />
      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.1-4.1 1.1-3.1 0-5.8-2.1-6.7-5h-4v3.1C3.4 20.5 7.4 23 12 23z" />
      <path fill="#FBBC05" d="M5.3 13.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V5.7h-4C.5 7.3 0 9.1 0 11s.5 3.7 1.3 5.3z" />
      <path fill="#EA4335" d="M12 4.4c1.7 0 3.3.6 4.6 1.7l3.4-3.4C18 .9 15.2 0 12 0 7.4 0 3.4 2.5 1.3 6.3l4 3.1C6.2 6.5 8.9 4.4 12 4.4z" />
    </svg>
  ),
  apple: (p: IconProps) => (
    <svg viewBox="0 0 24 24" width={p.size ?? 16} height={p.size ?? 16} fill="currentColor" {...p}>
      <path d="M16.5 12.5c0-2.5 2-3.7 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9s-1.9-.9-3.2-.8c-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.5s1.7-.8 3.2-.8 1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.4-2.8-.1 0-2.7-1-2.8-4zm-2.4-7.4c.7-.8 1.1-2 1-3.1-.9.1-2.1.6-2.7 1.4-.6.7-1.2 1.9-1 3 1 .1 2-.5 2.7-1.3z" />
    </svg>
  ),
};

export type IconName = keyof typeof Icons;

export function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = Icons[name as IconName];
  if (!Icon) return null;
  return <Icon size={size} />;
}
