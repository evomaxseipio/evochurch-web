export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("evochurch-theme");
  return stored === "dark" || stored === "light" ? stored : null;
}

export function resolveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("evochurch-theme", theme);
}
