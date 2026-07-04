import {
  brandLogoForSurface,
  FUENTE_INAGOTABLE,
  type BrandLogoSurface,
} from "@/lib/brand";

export function ChurchLogo({
  surface = "brand",
  size = 32,
  alt = FUENTE_INAGOTABLE.displayName,
  className = "",
}: {
  surface?: BrandLogoSurface;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const src = brandLogoForSurface(surface);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset estático multitenant en /public
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      decoding="async"
    />
  );
}
