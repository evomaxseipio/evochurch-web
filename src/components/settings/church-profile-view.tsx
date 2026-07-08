"use client";

import { ChurchLogo } from "@/components/brand/church-logo";
import {
  saveChurchProfileAction,
  uploadChurchLogoAction,
  type ChurchProfileActionResult,
} from "@/app/(app)/settings/church/actions";
import { normalizeChurchHexColor } from "@/lib/brand/church-defaults";
import type { ChurchProfile } from "@/lib/services/church-profile";
import { useTranslations } from "next-intl";
import { useActionState, useRef, useState, useTransition } from "react";

function ColorField({
  id,
  label,
  name,
  value,
  disabled,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  disabled: boolean;
}) {
  const normalized = normalizeChurchHexColor(value);
  const pickerValue = normalized.toLowerCase();

  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-[var(--fg-dim)]">{label}</span>
      <div className="flex items-center gap-3">
        <input
          key={`${name}-${pickerValue}`}
          id={id}
          type="color"
          name={name}
          defaultValue={pickerValue}
          disabled={disabled}
          className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--hairline)] bg-transparent p-1"
        />
        <input
          type="text"
          name={`${name}Display`}
          defaultValue={normalized}
          disabled
          readOnly
          className="input flex-1 font-mono text-sm"
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--fg)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  disabled,
  required,
  type = "text",
  className = "",
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-[var(--fg-dim)]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        className="input w-full"
      />
      {hint ? <span className="text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function ChurchProfileView({
  profile,
  logoSignedUrl,
  canWrite,
}: {
  profile: ChurchProfile;
  logoSignedUrl: string | null;
  canWrite: boolean;
}) {
  const t = useTranslations("settings.church");
  const tCommon = useTranslations("common");
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState(logoSignedUrl);
  const [logoPath, setLogoPath] = useState(profile.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPending, startLogoTransition] = useTransition();

  const [state, formAction, pending] = useActionState<
    ChurchProfileActionResult | null,
    FormData
  >(saveChurchProfileAction, null);

  const currentProfile = state?.ok ? state.profile : profile;
  const saveError = state && !state.ok ? state.error : null;

  function handleLogoChange() {
    const file = fileRef.current?.files?.[0];
    if (!file || !canWrite) return;

    setLogoError(null);
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);

    const formData = new FormData();
    formData.set("logo", file);

    startLogoTransition(async () => {
      const result = await uploadChurchLogoAction(formData);
      if (!result.ok) {
        setLogoError(result.error);
        setLogoPreview(logoSignedUrl);
        return;
      }
      setLogoPath(result.profile.logoUrl);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </header>

      {!canWrite ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--warning-bg)", color: "var(--warn)" }}
        >
          {t("readOnlyHint")}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ChurchLogo logoUrl={logoPreview} size={56} alt={currentProfile.name} />
            <div>
              <h2 className="text-lg font-semibold">{t("logoTitle")}</h2>
              <p className="text-sm text-[var(--muted)]">{t("logoHint")}</p>
            </div>
          </div>
          {canWrite ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                className="btn"
                disabled={logoPending}
                onClick={() => fileRef.current?.click()}
              >
                {logoPending ? tCommon("saving") : t("uploadLogo")}
              </button>
            </div>
          ) : null}
        </div>
        {logoError ? (
          <p className="mt-3 text-sm text-[var(--danger)]">{logoError}</p>
        ) : null}
      </section>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="logoUrl" value={logoPath ?? ""} />

        <Section title={t("sections.identity")} description={t("sections.identityHint")}>
          <Field
            label={t("fields.name")}
            name="name"
            defaultValue={currentProfile.name}
            disabled={!canWrite}
            required
          />
          <Field
            label={t("fields.shortName")}
            name="shortName"
            defaultValue={currentProfile.shortName ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.legalName")}
            name="legalName"
            defaultValue={currentProfile.legalName ?? ""}
            disabled={!canWrite}
            className="md:col-span-2"
          />
          <Field
            label={t("fields.slug")}
            name="slug"
            defaultValue={currentProfile.slug}
            disabled={!canWrite}
            required
            hint={t("fields.slugHint")}
            className="md:col-span-2"
          />
        </Section>

        <Section title={t("sections.contact")}>
          <Field
            label={t("fields.addressLine1")}
            name="addressLine1"
            defaultValue={currentProfile.addressLine1 ?? ""}
            disabled={!canWrite}
            className="md:col-span-2"
          />
          <Field
            label={t("fields.addressLine2")}
            name="addressLine2"
            defaultValue={currentProfile.addressLine2 ?? ""}
            disabled={!canWrite}
            className="md:col-span-2"
          />
          <Field
            label={t("fields.city")}
            name="city"
            defaultValue={currentProfile.city ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.stateProvince")}
            name="stateProvince"
            defaultValue={currentProfile.stateProvince ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.countryCode")}
            name="countryCode"
            defaultValue={currentProfile.countryCode ?? "DO"}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.postalCode")}
            name="postalCode"
            defaultValue={currentProfile.postalCode ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.phone")}
            name="phone"
            defaultValue={currentProfile.phone ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.email")}
            name="email"
            type="email"
            defaultValue={currentProfile.email ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.websiteUrl")}
            name="websiteUrl"
            defaultValue={currentProfile.websiteUrl ?? ""}
            disabled={!canWrite}
            className="md:col-span-2"
          />
        </Section>

        <Section title={t("sections.branding")}>
          <ColorField
            id="primaryColor"
            label={t("fields.primaryColor")}
            name="primaryColor"
            value={currentProfile.primaryColor}
            disabled={!canWrite}
          />
          <ColorField
            id="secondaryColor"
            label={t("fields.secondaryColor")}
            name="secondaryColor"
            value={currentProfile.secondaryColor}
            disabled={!canWrite}
          />
          <ColorField
            id="accentColor"
            label={t("fields.accentColor")}
            name="accentColor"
            value={currentProfile.accentColor}
            disabled={!canWrite}
          />
        </Section>

        <Section title={t("sections.official")}>
          <Field
            label={t("fields.externalCode")}
            name="externalCode"
            defaultValue={currentProfile.externalCode ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.presbyteryName")}
            name="presbyteryName"
            defaultValue={currentProfile.presbyteryName ?? ""}
            disabled={!canWrite}
          />
          <Field
            label={t("fields.timezone")}
            name="timezone"
            defaultValue={currentProfile.timezone}
            disabled={!canWrite}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--fg-dim)]">
              {t("fields.defaultLocale")}
            </span>
            <select
              name="defaultLocale"
              defaultValue={currentProfile.defaultLocale}
              disabled={!canWrite}
              className="input w-full"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </Section>

        {saveError ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
          >
            {saveError}
          </p>
        ) : null}

        {state?.ok ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--success-bg)", color: "var(--ok)" }}
          >
            {t("saved")}
          </p>
        ) : null}

        {canWrite ? (
          <div className="flex justify-end">
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? tCommon("saving") : tCommon("save")}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
