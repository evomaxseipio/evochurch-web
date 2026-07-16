"use server";

import { churchPath } from "@/lib/apps/church-routes";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { hasPermission } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import type { DiscountPeriodRun } from "@/lib/discounts/types";
import {
  generateTitheClosePdf,
  titheClosePdfFilename,
} from "@/lib/finances/tithe-close-pdf";
import { encodeReportBase64 } from "@/lib/reports/filenames";
import {
  closeDiscountPeriodRun,
  fetchDiscountPeriodRun,
  seedDefaultTitheTemplate,
} from "@/lib/services/tithe-close";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

export type TitheCloseActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type TitheCloseExportResult =
  | { ok: true; filename: string; mimeType: string; base64: string }
  | { ok: false; error: string };

export type PreviewTitheCloseResult =
  | {
      ok: true;
      run: DiscountPeriodRun | null;
      noTemplate: boolean;
      canWrite: boolean;
      canManageTemplates: boolean;
      churchName: string | null;
    }
  | { ok: false; error: string };

async function readContext(needWrite = false) {
  const perm = needWrite
    ? "finances:tithe_close:write"
    : "finances:tithe_close:read";
  const { supabase, session } = await getActionSessionWith(perm);
  return { supabase, session };
}

function revalidateTitheClosePaths() {
  revalidatePath(churchPath("/reports"));
  revalidatePath(churchPath("/settings/discount-templates"));
}

export async function previewTitheCloseAction(
  periodStart: string,
): Promise<PreviewTitheCloseResult> {
  const t = await getTranslations("finances.titheClose");
  try {
    const { supabase, session } = await readContext(false);
    let result = await fetchDiscountPeriodRun(
      supabase,
      session.churchId,
      periodStart,
    );
    if (
      result.noTemplate &&
      hasPermission(session, "settings:discount_templates:write")
    ) {
      await seedDefaultTitheTemplate(supabase, session.churchId);
      result = await fetchDiscountPeriodRun(
        supabase,
        session.churchId,
        periodStart,
      );
    }
    return {
      ok: true,
      run: result.run,
      noTemplate: result.noTemplate,
      canWrite: hasPermission(session, "finances:tithe_close:write"),
      canManageTemplates: hasPermission(
        session,
        "settings:discount_templates:write",
      ),
      churchName: session.churchName ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("closeFailed"),
    };
  }
}

export async function seedDefaultTitheTemplateAction(): Promise<TitheCloseActionResult> {
  const t = await getTranslations("finances.titheClose");
  try {
    const { supabase, session } = await readContext(true);
    await seedDefaultTitheTemplate(supabase, session.churchId);
    revalidateTitheClosePaths();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("seedFailed"),
    };
  }
}

export async function closeTitheWeekAction(
  periodStart: string,
): Promise<TitheCloseActionResult> {
  const t = await getTranslations("finances.titheClose");
  try {
    const { supabase, session } = await readContext(true);
    await closeDiscountPeriodRun(supabase, session.churchId, periodStart);
    revalidateTitheClosePaths();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("closeFailed"),
    };
  }
}

export async function exportTitheClosePdfAction(
  periodStart: string,
  locale: string,
): Promise<TitheCloseExportResult> {
  const t = await getTranslations("finances.titheClose");
  try {
    const resolvedLocale: Locale = isLocale(locale) ? locale : "es";
    const { supabase, session } = await readContext(false);
    const { run } = await fetchDiscountPeriodRun(
      supabase,
      session.churchId,
      periodStart,
    );
    if (!run) {
      return { ok: false, error: t("noTemplate") };
    }

    const data = await generateTitheClosePdf(
      {
        churchName: session.churchName ?? "",
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        status: run.status,
        baseAmount: run.baseAmount,
        allocation: run.allocation,
        contributions: run.contributions,
        generatedAt: new Date().toISOString(),
        closedAt: run.closedAt,
      },
      resolvedLocale,
    );

    return {
      ok: true,
      filename: titheClosePdfFilename(periodStart),
      mimeType: "application/pdf",
      base64: encodeReportBase64(data),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("exportFailed"),
    };
  }
}
