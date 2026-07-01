"use client";

import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useEffect, useState } from "react";

type SettingsTab =
  | "perfil"
  | "apariencia"
  | "idioma"
  | "roles"
  | "notif"
  | "acceso";

type LocaleCode = "es-DO" | "es" | "en" | "ht";

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  bio: string;
};

const NAV_ITEMS: {
  id: SettingsTab;
  label: string;
  icon: keyof typeof Icons;
}[] = [
  { id: "perfil", label: "Perfil", icon: "users" },
  { id: "apariencia", label: "Apariencia", icon: "moon" },
  { id: "idioma", label: "Idioma", icon: "globe" },
  { id: "roles", label: "Roles y permisos", icon: "settings" },
  { id: "notif", label: "Notificaciones", icon: "bell" },
  { id: "acceso", label: "Acceso y catálogos", icon: "grid" },
];

const LANGUAGE_OPTIONS: {
  code: LocaleCode;
  label: string;
  flag: string;
}[] = [
  { code: "es-DO", label: "Español (República Dominicana)", flag: "🇩🇴" },
  { code: "es", label: "Español (Internacional)", flag: "🌎" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ht", label: "Kreyòl Ayisyen", flag: "🇭🇹" },
];

const SYSTEM_ROLES = [
  { name: "Administrador", members: 2, permissions: "Acceso total", color: "var(--primary)" },
  { name: "Pastor", members: 3, permissions: "Miembros, Eventos, Comunicación", color: "var(--accent-600)" },
  { name: "Tesorero", members: 1, permissions: "Finanzas, Reportes", color: "var(--success)" },
  { name: "Secretario", members: 4, permissions: "Miembros, Eventos", color: "var(--info)" },
  { name: "Líder", members: 8, permissions: "Miembros (lectura), Eventos", color: "#A855F7" },
  { name: "Miembro", members: 1230, permissions: "Solo lectura", color: "var(--ink-3)" },
];

const NOTIFICATION_ITEMS = [
  "Nuevos miembros",
  "Diezmos y ofrendas",
  "Recordatorios de eventos",
  "Mensajes directos",
  "Reportes semanales",
  "Notificaciones por email",
  "Notificaciones push (PWA)",
] as const;

const NOTIFICATION_DEFAULTS: Record<(typeof NOTIFICATION_ITEMS)[number], boolean> = {
  "Nuevos miembros": true,
  "Diezmos y ofrendas": true,
  "Recordatorios de eventos": true,
  "Mensajes directos": true,
  "Reportes semanales": false,
  "Notificaciones por email": true,
  "Notificaciones push (PWA)": true,
};

const LOCALE_STORAGE_KEY = "evochurch-locale";
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

function loadLocale(): LocaleCode {
  if (typeof window === "undefined") return "es-DO";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "es-DO" || stored === "es" || stored === "en" || stored === "ht") {
    return stored;
  }
  return "es-DO";
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
  const [tab, setTab] = useState<SettingsTab>("perfil");
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocale] = useState<LocaleCode>("es-DO");
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
    setLocale(loadLocale());
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

  function selectLocale(code: LocaleCode) {
    setLocale(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    toast.success("Idioma actualizado", "La preferencia se guardó en este dispositivo.");
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
    toast.success("Perfil actualizado", "Tus cambios fueron guardados.");
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
            Configuración{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              y perfil
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Personaliza tu perfil, apariencia y preferencias del sistema.
          </p>
        </div>
        {tab === "perfil" ? (
          <div className="row">
            <button type="button" className="btn primary" onClick={saveProfile}>
              <Icons.check width={16} /> Guardar cambios
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid-12" style={{ marginTop: 24 }}>
        <div className="span-3">
          <div className="card" style={{ padding: 8 }}>
            {NAV_ITEMS.map(({ id, label, icon }) => {
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
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="span-9">
          {tab === "perfil" ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  padding: 32,
                  background:
                    "linear-gradient(135deg, var(--primary), var(--primary-500))",
                  color: "#fff",
                  borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 240,
                    height: 200,
                    opacity: 0.18,
                  }}
                  viewBox="0 0 200 200"
                  aria-hidden
                >
                  <circle cx="160" cy="40" r="80" fill="var(--glow)" />
                </svg>
                <div
                  className="row"
                  style={{ gap: 20, position: "relative", alignItems: "center" }}
                >
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 24,
                      background:
                        "linear-gradient(135deg, var(--lila), var(--accent))",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: 36,
                      fontWeight: 600,
                      boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
                    }}
                  >
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
                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      {profile.jobTitle || roleLabel}
                      {churchName ? ` · ${churchName}` : ""}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 12 }}>
                      <span
                        className="chip"
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          border: 0,
                        }}
                      >
                        {roleLabel}
                      </span>
                      {isVerified ? (
                        <span
                          className="chip"
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            color: "#fff",
                            border: 0,
                          }}
                        >
                          Verificado
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 28 }}>
                <div className="grid-12" style={{ gap: 14 }}>
                  <div className="field span-6">
                    <label>Nombre completo</label>
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
                    <label>Email</label>
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
                    <label>Teléfono</label>
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
                    <label>Cargo</label>
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
                    <label>Biografía</label>
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
                        placeholder="Cuéntanos un poco sobre ti…"
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
                    Cancelar
                  </button>
                  <button type="button" className="btn primary" onClick={saveProfile}>
                    <Icons.check width={14} /> Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "apariencia" ? (
            <div className="col gap-md">
              <div className="card">
                <div className="eyebrow">Tema</div>
                <div
                  className="display"
                  style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
                >
                  Modo de visualización
                </div>
                <div className="grid-12" style={{ gap: 12 }}>
                  {(
                    [
                      {
                        value: "light" as const,
                        label: "Claro",
                        icon: "sun" as const,
                        bg: "linear-gradient(135deg, #FAFAF7, #FFFFFF)",
                        border: "var(--hairline)",
                        darkText: true,
                      },
                      {
                        value: "dark" as const,
                        label: "Oscuro",
                        icon: "moon" as const,
                        bg: "linear-gradient(135deg, #07101F, #0E1B33)",
                        border: "rgba(255,255,255,0.1)",
                        darkText: false,
                      },
                    ] as const
                  ).map((t) => {
                    const Icon = Icons[t.icon];
                    const selected = theme === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        className="span-6"
                        onClick={() => selectTheme(t.value)}
                        style={{
                          padding: 18,
                          borderRadius: 16,
                          cursor: "pointer",
                          border: `2px solid ${selected ? "var(--primary)" : "transparent"}`,
                          background: t.bg,
                          color: t.darkText ? "var(--ink)" : "#fff",
                          textAlign: "left",
                        }}
                      >
                        <div className="row between">
                          <div className="row" style={{ gap: 10 }}>
                            <Icon width={20} />
                            <span style={{ fontWeight: 600 }}>{t.label}</span>
                          </div>
                          {selected ? (
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                background: "var(--primary)",
                                color: "#fff",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              <Icons.check width={14} />
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            marginTop: 12,
                            height: 60,
                            borderRadius: 8,
                            border: `1px solid ${t.border}`,
                            padding: 8,
                            display: "flex",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              background: "rgba(127,127,127,0.2)",
                              borderRadius: 4,
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                height: 6,
                                background: "rgba(127,127,127,0.3)",
                                borderRadius: 3,
                                width: "70%",
                              }}
                            />
                            <div
                              style={{
                                height: 6,
                                background: "rgba(127,127,127,0.2)",
                                borderRadius: 3,
                                width: "50%",
                              }}
                            />
                            <div
                              style={{
                                marginTop: "auto",
                                height: 8,
                                background: "var(--primary)",
                                borderRadius: 3,
                                width: 40,
                              }}
                            />
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
              <div className="eyebrow">Idioma</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                Idioma de la aplicación
              </div>
              <div className="col" style={{ gap: 8 }}>
                {LANGUAGE_OPTIONS.map((l) => {
                  const active = locale === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      className="row between"
                      onClick={() => selectLocale(l.code)}
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 12,
                        border: `1px solid ${active ? "var(--primary)" : "var(--hairline)"}`,
                        background: active ? "var(--primary-50)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div className="row" style={{ gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{l.flag}</span>
                        <span style={{ fontWeight: 500, color: "var(--fg)" }}>
                          {l.label}
                        </span>
                      </div>
                      {active ? (
                        <Icons.check width={18} stroke="var(--primary)" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {tab === "roles" ? (
            <div className="card">
              <div className="eyebrow">Permisos</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                Roles del sistema
              </div>
              <div className="table-wrap">
                <table className="table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Rol</th>
                      <th>Miembros</th>
                      <th>Permisos clave</th>
                      <th className="col-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {SYSTEM_ROLES.map((r) => (
                      <tr key={r.name}>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <span
                              style={{
                                width: 8,
                                height: 24,
                                background: r.color,
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontWeight: 600 }}>{r.name}</span>
                          </div>
                        </td>
                        <td className="muted tnum">
                          {r.members.toLocaleString("es-DO")}
                        </td>
                        <td className="muted tiny">{r.permissions}</td>
                        <td className="col-actions">
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() =>
                              toast.info(
                                "Próximamente",
                                "La edición de roles estará disponible pronto.",
                              )
                            }
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === "notif" ? (
            <div className="card">
              <div className="eyebrow">Preferencias</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                Notificaciones
              </div>
              <div className="col" style={{ gap: 4 }}>
                {NOTIFICATION_ITEMS.map((label, i) => (
                  <div
                    key={label}
                    className="row between"
                    style={{
                      padding: "12px 4px",
                      borderBottom:
                        i < NOTIFICATION_ITEMS.length - 1
                          ? "1px solid var(--hairline)"
                          : "0",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{label}</span>
                    <CrudSwitch
                      on={notifPrefs[label]}
                      onChange={(on) => toggleNotification(label, on)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "acceso" ? (
            <div className="card">
              <div className="eyebrow">Administración</div>
              <div
                className="display"
                style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}
              >
                Acceso y catálogos
              </div>
              <div className="col" style={{ gap: 8 }}>
                {[
                  {
                    href: "/settings/users",
                    title: "Usuarios del sistema",
                    desc: "Cuentas con acceso administrativo a EvoChurch.",
                    icon: "users" as const,
                  },
                  {
                    href: "/settings/expenses",
                    title: "Tipos de gasto",
                    desc: "Categorías para egresos y transacciones.",
                    icon: "wallet" as const,
                  },
                  {
                    href: "/settings/income-types",
                    title: "Tipos de ingreso",
                    desc: "Categorías para ingresos operacionales.",
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
