"use client";

import { Icons } from "@/components/icons";
import { localeLabels, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/lib/i18n/set-locale";
import { toast } from "@/lib/toast";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type LocaleSwitcherProps = {
  variant?: "compact" | "list";
  className?: string;
};

export function LocaleSwitcher({
  variant = "compact",
  className = "",
}: LocaleSwitcherProps) {
  const t = useTranslations("common");
  const tErrors = useTranslations("errors");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const locales = Object.keys(localeLabels) as Locale[];

  async function selectLocale(locale: Locale) {
    if (locale === currentLocale || pending) return;
    startTransition(async () => {
      const result = await setLocaleAction(locale);
      if (result.ok) {
        toast.success(t("localeUpdated"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(tErrors("invalidLocale"));
      }
    });
  }

  if (variant === "list") {
    return (
      <div className={`col ${className}`.trim()} style={{ gap: 8 }}>
        {locales.map((code) => {
          const { label, flag } = localeLabels[code];
          const active = code === currentLocale;
          return (
            <button
              key={code}
              type="button"
              className="row between locale-picker-row"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 12,
                border: `1px solid ${active ? "var(--primary)" : "var(--hairline)"}`,
                background: active ? "var(--primary-50)" : "transparent",
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.7 : 1,
                font: "inherit",
                color: "inherit",
              }}
              disabled={pending}
              onClick={() => selectLocale(code)}
              aria-pressed={active}
            >
              <span className="row" style={{ gap: 12 }}>
                <span aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>
                  {flag}
                </span>
                <span style={{ fontWeight: 500 }}>{label}</span>
              </span>
              {active ? (
                <Icons.check size={18} stroke="var(--primary)" />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`.trim()} ref={menuRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("languageSwitcher")}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={pending}
        title={localeLabels[currentLocale].label}
      >
        <span
          aria-hidden
          style={{ fontSize: 18, lineHeight: 1 }}
        >
          {localeLabels[currentLocale].flag}
        </span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label={t("selectLanguage")}
            className="absolute right-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-xl border py-1"
            style={{
              background: "var(--bg-1)",
              borderColor: "var(--line)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            {locales.map((code) => {
              const { label, flag, code: shortCode } = localeLabels[code];
              const active = code === currentLocale;
              return (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="block w-full px-3 py-2 text-left text-sm"
                  style={{
                    background: active
                      ? "color-mix(in oklab, var(--primary) 12%, transparent)"
                      : undefined,
                    fontWeight: active ? 600 : 400,
                  }}
                  onClick={() => selectLocale(code)}
                >
                  <span className="row" style={{ gap: 8 }}>
                    <span aria-hidden>{flag}</span>
                    <span>{label}</span>
                    <span className="tiny muted" style={{ marginLeft: "auto" }}>
                      {shortCode}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
