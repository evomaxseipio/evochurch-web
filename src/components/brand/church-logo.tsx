import {
  brandLogoForSurface,
  FUENTE_INAGOTABLE,
  type BrandLogoSurface,
} from "@/lib/brand";

export function ChurchLogo({
  surface = "brand",
  size = 32,
  alt,
  logoUrl,
  className = "",
}: {
  surface?: BrandLogoSurface;
  size?: number;
  alt?: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const fallbackAlt = alt ?? FUENTE_INAGOTABLE.displayName;
  const src = logoUrl?.trim() || brandLogoForSurface(surface);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- tenant logo (signed URL) o asset estático
    <img
      src={src}
      alt={fallbackAlt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      decoding="async"
    />
  );
}
