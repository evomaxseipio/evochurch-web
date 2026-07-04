"use client";

import { Icons } from "@/components/icons";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type SettingsTab =
  | "perfil"
  | "apariencia"
  | "idioma"
  | "notif"
  | "acceso";

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  bio: string;
};

const NAV_ITEMS: {
  id: SettingsTab;
  labelKey: string;
  icon: keyof typeof Icons;
}[] = [
  { id: "perfil", labelKey: "tabs.profile", icon: "users" },
  { id: "apariencia", labelKey: "tabs.appearance", icon: "moon" },
  { id: "idioma", labelKey: "tabs.language", icon: "globe" },
  { id: "notif", labelKey: "tabs.notifications", icon: "bell" },
  { id: "acceso", labelKey: "tabs.access", icon: "grid" },
];

const NOTIFICATION_ITEMS = [
  "newMembers",
  "tithesOfferings",
  "eventReminders",
  "directMessages",
  "weeklyReports",
  "email",
  "push",
] as const;

const NOTIFICATION_DEFAULTS: Record<(typeof NOTIFICATION_ITEMS)[number], boolean> = {
  newMembers: true,
  tithesOfferings: true,
  eventReminders: true,
  directMessages: true,
  weeklyReports: false,
  email: true,
  push: true,
};

const NOTIF_STORAGE_KEY = "evochurch-notif-prefs";

function initials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function displayNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: fullName, rest: "" };
  return { first: parts[0], rest: parts.slice(1).join(" ") };
}

function loadNotificationPrefs(): Record<(typeof NOTIFICATION_ITEMS)[number], boolean> {
  if (typeof window === "undefined") return { ...NOTIFICATION_DEFAULTS };
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return { ...NOTIFICATION_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<typeof NOTIFICATION_DEFAULTS>;
    return { ...NOTIFICATION_DEFAULTS, ...parsed };
  } catch {
    return { ...NOTIFICATION_DEFAULTS };
  }
}

export function SettingsView({
  fullName,
  email,
  roleLabel,
  churchName,
  isVerified,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
  churchName: string | null;
  isVerified: boolean;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<SettingsTab>("perfil");
  const [theme, setTheme] = useState<Theme>("dark");
  const [notifPrefs, setNotifPrefs] = useState(loadNotificationPrefs);
  const [profile, setProfile] = useState<ProfileForm>(() => ({
    fullName,
    email,
    phone: "",
    jobTitle: roleLabel,
    bio: "",
  }));
  const [profileBaseline, setProfileBaseline] = useState(profile);

  const nameParts = displayNameParts(profile.fullName);

  useEffect(() => {
    const fromDom = document.documentElement.getAttribute("data-theme");
    if (fromDom === "light" || fromDom === "dark") {
      setTheme(fromDom);
    } else {
      setTheme(resolveTheme());
    }
    setNotifPrefs(loadNotificationPrefs());
  }, []);

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      fullName,
      email,
      jobTitle: roleLabel,
    }));
    setProfileBaseline((prev) => ({
      ...prev,
      fullName,
      email,
      jobTitle: roleLabel,
    }));
  }, [fullName, email, roleLabel]);

  function selectTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  function toggleNotification(key: (typeof NOTIFICATION_ITEMS)[number], on: boolean) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: on };
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function saveProfile() {
    setProfileBaseline(profile);
    toast.success(t("toasts.profileUpdated"), t("toasts.profileSaved"));
  }

  function resetProfile() {
    setProfile(profileBaseline);
  }

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Cuenta</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {t("title")}{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              {t("profileAndSettings")}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("subtitle")}
          </p>
        </div>
        {tab === "perfil" ? (
          <div className="row">
            <button type="button" className="btn primary" onClick={saveProfile}>
              <Icons.check width={16} /> {tCommon("saveChanges")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid-12" style={{ marginTop: 24 }}>
        <div className="span-3">
          <div className="card" style={{ padding: 8 }}>
            {NAV_ITEMS.map(({ id, labelKey, icon }) => {
              const Icon = Icons[icon];
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: "none",
                    background: active ? "var(--primary-50)" : "transparent",
                    color: active ? "var(--primary-600)" : "var(--ink-2)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                  }}
                >
                  <Icon width={16} />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="span-9">
          {tab === "perfil" ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="settings-profile-hero">
                <svg
                  className="settings-profile-hero-glow"
                  viewBox="0 0 200 200"
                  aria-hidden
                >
                  <circle cx="160" cy="40" r="80" fill="#fff" />
                </svg>
                <div
                  className="row"
                  style={{ gap: 20, position: "relative", alignItems: "center" }}
                >
                  <div className="settings-profile-hero-avatar">
                    {initials(profile.fullName)}
                  </div>
                  <div>
                    <div
                      className="display"
                      style={{ fontSize: 32, lineHeight: 1.1 }}
                    >
                      {nameParts.first}
                      {nameParts.rest ? (
                        <>
                          {" "}
                          <em style={{ fontStyle: "italic" }}>{nameParts.rest}</em>
                        </>
                      ) : null}
                    </div>
                    <div className="settings-profile-hero-sub">
                      {profile.jobTitle || roleLabel}
                      {churchName ? ` · ${churchName}` : ""}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 12 }}>
                      <span className="chip">{roleLabel}</span>
                      {isVerified ? (
                        <span className="chip">{tCommon("verified")}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 28 }}>
                <div className="grid-12" style={{ gap: 14 }}>
                  <div className="field span-6">
                    <label>{t("fullName")}</label>
                    <div className="input-wrap">
                      <input
                        value={profile.fullName}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, fullName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="field span-6">
                    <label>{tCommon("email")}</label>
                    <div className="input-wrap">
                      <input
                        value={profile.email}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, email: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="field span-6">
                    <label>{tCommon("phone")}</label>
                    <div className="input-wrap">
                      <input
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="(809) 555-0001"
                      />
                    </div>
                  </div>
                  <div className="field span-6">
                    <label>{t("role")}</label>
                    <div className="input-wrap">
                      <input
                        value={profile.jobTitle}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, jobTitle: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="field span-12">
                    <label>{t("bio")}</label>
                    <div
                      className="input-wrap"
                      style={{ alignItems: "flex-start", padding: "10px 12px" }}
                    >
                      <textarea
                        rows={3}
                        value={profile.bio}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, bio: e.target.value }))
                        }
                        placeholder={t("bioPlaceholder")}
                        style={{ resize: "vertical", minHeight: 72 }}
                      />
                    </div>
                  </div>
                </div>
                <div
                  className="row"
                  style={{ marginTop: 20, justifyContent: "flex-end", gap: 10 }}
                >
                  <button type="button" className="btn outline" onClick={resetProfile}>
                    {tCommon("cancel")}
                  </button>
                  <button type="button" className="btn primary" onClick={saveProfile}>
                    <Icons.check width={14} /> {tCommon("saveChanges")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "apariencia" ? (
            <div className="col gap-md">
              <div className="card">
                <div className="eyebrow">{t("theme")}</div>
                <div
                  className="display"
                  style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
                >
                  {t("displayMode")}
                </div>
                <div className="grid-12" style={{ gap: 12 }}>
                  {(
                    [
                      {
                        value: "light" as const,
                        label: t("light"),
                        icon: "sun" as const,
                      },
                      {
                        value: "dark" as const,
                        label: t("dark"),
                        icon: "moon" as const,
                      },
                    ] as const
                  ).map((t) => {
                    const Icon = Icons[t.icon];
                    const selected = theme === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        className={`span-6 theme-picker-card theme-picker-card--${t.value}${selected ? " is-selected" : ""}`}
                        onClick={() => selectTheme(t.value)}
                      >
                        <div className="row between">
                          <div className="row" style={{ gap: 10 }}>
                            <Icon width={20} />
                            <span className="theme-picker-label">{t.label}</span>
                          </div>
                          {selected ? (
                            <span className="theme-picker-check">
                              <Icons.check width={14} />
                            </span>
                          ) : null}
                        </div>
                        <div className="theme-picker-preview">
                          <div className="theme-picker-preview-thumb" />
                          <div className="theme-picker-preview-body">
                            <div className="theme-picker-preview-line long" />
                            <div className="theme-picker-preview-line short" />
                            <div className="theme-picker-preview-accent" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "idioma" ? (
            <div className="card">
              <div className="eyebrow">{t("tabs.language")}</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                {t("appLanguage")}
              </div>
              <LocaleSwitcher variant="list" />
            </div>
          ) : null}

          {tab === "notif" ? (
            <div className="card">
              <div className="eyebrow">{t("notificationsEyebrow")}</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                {t("tabs.notifications")}
              </div>
              <div className="col" style={{ gap: 4 }}>
                {NOTIFICATION_ITEMS.map((key, i) => (
                  <div
                    key={key}
                    className="row between"
                    style={{
                      padding: "12px 4px",
                      borderBottom:
                        i < NOTIFICATION_ITEMS.length - 1
                          ? "1px solid var(--hairline)"
                          : "0",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{t(`notifications.${key}`)}</span>
                    <CrudSwitch
                      on={notifPrefs[key]}
                      onChange={(on) => toggleNotification(key, on)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "acceso" ? (
            <div className="card">
              <div className="eyebrow">{t("access.eyebrow")}</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                {t("tabs.access")}
              </div>
              <div className="col" style={{ gap: 8 }}>
                {[
                  {
                    href: "/settings/users",
                    title: t("access.systemUsers"),
                    desc: t("access.systemUsersDesc"),
                    icon: "users" as const,
                  },
                  {
                    href: "/settings/expenses",
                    title: t("access.expenseTypes"),
                    desc: t("access.expenseTypesDesc"),
                    icon: "wallet" as const,
                  },
                  {
                    href: "/settings/income-types",
                    title: t("access.incomeTypes"),
                    desc: t("access.incomeTypesDesc"),
                    icon: "trendUp" as const,
                  },
                ].map((item) => {
                  const Icon = Icons[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="row between"
                      style={{
                        padding: "14px 18px",
                        borderRadius: 12,
                        border: "1px solid var(--hairline)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div className="row" style={{ gap: 12 }}>
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "var(--primary-50)",
                            color: "var(--primary)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Icon width={16} />
                        </span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div className="tiny muted">{item.desc}</div>
                        </div>
                      </div>
                      <Icons.arrowDn
                        width={16}
                        style={{ transform: "rotate(-90deg)", opacity: 0.4 }}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
