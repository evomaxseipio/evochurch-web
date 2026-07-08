/**
 * PDF directorio de miembros — réplica de `MembershipDirectoryFormPrint`.
 */
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { formatDateTime } from "@/lib/i18n/format";
import { contentWidth } from "@/lib/reports/export/pdf-form";
import {
  DIRECTORY_COLUMN_KEYS,
  directoryColumnWidths,
  memberDirectoryRow,
  paginateMembersForPrint,
  sortMembersByName,
} from "@/lib/reports/templates/membership/directory-helpers";
import type { MembershipDirectoryPayload } from "@/lib/services/reports";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

const NAVY = "#1c2b4a";
const MUTED = "#8b909c";
const TEXT = "#161821";
const TEXT_2 = "#565b68";
const BORDER = "#e2e4e9";
const GOLD = "#b8863b";
const PURPLE = "#5b3fb0";
const GREEN = "#0f7a4a";
const RED = "#b3401f";
const ORANGE = "#c2660a";
const BLUE = "#2563eb";
const NOTES_BG = "#fdf1de";
const NOTES_TEXT = "#8a5a12";

const ROW_HEIGHT = 13;
/** Debe caber título + 4 filas de distribución (texto + track) con padding. */
const SUMMARY_BLOCK_HEIGHT = 88;
const SUMMARY_BAR_STEP = 14;
const SUMMARY_BARS_TOP = 20;
const SUMMARY_TRACK_OFFSET = 9;
const SUMMARY_TRACK_HEIGHT = 4;

function sanitizePdfText(text: string): string {
  return text.replace(/[\u2212\u2013\u2014]/g, "-");
}

function resolvePublicAsset(relativePath: string): string {
  return path.join(process.cwd(), "public", relativePath.replace(/^\//, ""));
}

function createLandscapeDocument(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({
    margin: 28,
    size: "A4",
    layout: "landscape",
  });
}

function drawHeader(
  doc: InstanceType<typeof PDFDocument>,
  payload: MembershipDirectoryPayload,
  locale: Locale,
  t: TranslateFn,
  generatedByName?: string | null,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y0 = doc.page.margins.top;
  const churchDisplay =
    payload.churchName?.trim() || FUENTE_INAGOTABLE.churchDisplayName;
  const pastorDisplay = payload.pastorName?.trim() || "—";
  const councilDisplay = payload.presbyterio?.trim() || "—";
  const generatedByDisplay = generatedByName?.trim() || "—";
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const filterLabel = t(`memberFilters.${payload.filter}`);

  const logoPath = resolvePublicAsset(brandLogoForSurface("document"));
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, left, y0, { width: 44, height: 44 });
  }

  const textX = left + 52;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY);
  doc.text(sanitizePdfText(t("preview.membershipDirectory.title")), textX, y0);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(PURPLE);
  doc.text(sanitizePdfText(churchDisplay), textX, y0 + 14);
  doc.font("Helvetica").fontSize(8).fillColor(MUTED);
  doc.text(
    sanitizePdfText(
      `${t("preview.membershipDirectory.pastor")}: ${pastorDisplay}  ·  ${t("preview.membershipDirectory.council")}: ${councilDisplay}`,
    ),
    textX,
    y0 + 28,
    { width: width * 0.55, lineBreak: false, ellipsis: true },
  );

  const infoW = 175;
  const infoX = left + width - infoW;
  const infoY = y0;
  doc.save().rect(infoX, infoY, infoW, 52).fill("#f3f5f8").restore();
  doc.save().rect(infoX, infoY, infoW, 52).strokeColor(BORDER).lineWidth(0.75).stroke().restore();
  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  let iy = infoY + 6;
  const infoLine = (label: string, value: string) => {
    doc.text(sanitizePdfText(`${label}: ${value}`), infoX + 6, iy, {
      width: infoW - 12,
      lineBreak: false,
      ellipsis: true,
    });
    iy += 11;
  };
  infoLine(t("preview.membershipDirectory.generatedAt"), generatedLabel);
  infoLine(t("preview.membershipDirectory.generatedBy"), generatedByDisplay);
  infoLine(t("preview.membershipDirectory.filterApplied"), filterLabel);

  doc.y = y0 + 58;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .strokeColor(GOLD)
    .lineWidth(2)
    .stroke();
  doc.y += 10;
}

function drawKpiStrip(
  doc: InstanceType<typeof PDFDocument>,
  payload: MembershipDirectoryPayload,
  t: TranslateFn,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.y;
  const stats = payload.stats;
  const items = [
    { label: t("preview.membershipDirectory.kpiTotal"), value: stats.total, color: BLUE },
    { label: t("preview.membershipDirectory.kpiMembers"), value: stats.members, color: PURPLE },
    { label: t("preview.membershipDirectory.kpiVisits"), value: stats.visits, color: ORANGE },
    { label: t("preview.membershipDirectory.kpiActive"), value: stats.active, color: GREEN },
    { label: t("preview.membershipDirectory.kpiInactive"), value: stats.inactive, color: RED },
  ];
  const colW = width / items.length;

  doc.save().rect(left, y, width, 32).fill("#f3f5f8").restore();
  items.forEach((item, index) => {
    const x = left + index * colW;
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(MUTED);
    doc.text(item.label.toUpperCase(), x + 8, y + 6, { width: colW - 12, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(item.color);
    doc.text(String(item.value), x + 8, y + 16, { width: colW - 12, lineBreak: false });
  });

  doc.y = y + 38;
}

function drawTableSectionTitle(
  doc: InstanceType<typeof PDFDocument>,
  continued: boolean,
  from: number,
  to: number,
  t: TranslateFn,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.y;

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PURPLE);
  doc.text(
    sanitizePdfText(
      continued
        ? t("preview.membershipDirectory.sectionDirectoryContinued")
        : t("preview.membershipDirectory.sectionDirectory"),
    ).toUpperCase(),
    left,
    y,
  );
  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  doc.text(
    sanitizePdfText(
      continued
        ? t("preview.membershipDirectory.recordsRange", { from, to })
        : t("preview.membershipDirectory.sortedBy"),
    ),
    left,
    y,
    { width, align: "right", lineBreak: false },
  );
  doc.y = y + 14;
}

function drawTableHeader(
  doc: InstanceType<typeof PDFDocument>,
  columnWidths: number[],
  t: TranslateFn,
): void {
  const left = doc.page.margins.left;
  const y = doc.y;
  const rowH = 15;
  const headers = [
    "#",
    ...DIRECTORY_COLUMN_KEYS.map((key) =>
      t(`exports.membershipDirectory.columns.${key}`),
    ),
  ];

  let x = left;
  headers.forEach((header, index) => {
    const w = columnWidths[index] ?? 0;
    doc.save().rect(x, y, w, rowH).fill("#f3f5f8").restore();
    doc.save().rect(x, y, w, rowH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(MUTED);
    doc.text(sanitizePdfText(header.toUpperCase()), x + 3, y + 4, {
      width: w - 6,
      height: rowH - 5,
      align: index === 0 || index >= 6 ? "center" : "left",
      lineBreak: false,
      ellipsis: true,
    });
    x += w;
  });

  doc.y = y + rowH;
}

function drawTableRow(
  doc: InstanceType<typeof PDFDocument>,
  columnWidths: number[],
  row: string[],
  rowNumber: number,
  stripe: boolean,
): void {
  const left = doc.page.margins.left;
  const y = doc.y;
  const cells = [String(rowNumber), ...row];

  let x = left;
  cells.forEach((cell, colIndex) => {
    const w = columnWidths[colIndex] ?? 0;
    if (stripe) {
      doc.save().rect(x, y, w, ROW_HEIGHT).fill("#fafbfd").restore();
    }
    doc.save().rect(x, y, w, ROW_HEIGHT).strokeColor("#eef0f3").lineWidth(0.5).stroke().restore();

    const isName = colIndex === 1;
    const isFlag = colIndex >= 6;
    const isMeta = colIndex === 2 || colIndex === 3 || colIndex === 4 || colIndex === 5;

    doc
      .font(isName ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isName ? 8 : 7.5)
      .fillColor(isMeta ? TEXT_2 : TEXT);

    if (isFlag) {
      const normalized = cell.toLowerCase();
      if (normalized === "sí" || normalized === "si" || normalized === "yes" || normalized === "oui") {
        doc.fillColor(GREEN);
      } else if (normalized === "no") {
        doc.fillColor(colIndex === 7 ? RED : MUTED);
      }
    }

    doc.text(sanitizePdfText(cell || "—"), x + 3, y + 2, {
      width: w - 6,
      height: ROW_HEIGHT - 3,
      align: colIndex === 0 || colIndex >= 6 ? "center" : "left",
      lineBreak: false,
      ellipsis: true,
    });
    x += w;
  });

  doc.y = y + ROW_HEIGHT;
}

function drawSummaryAndNotes(
  doc: InstanceType<typeof PDFDocument>,
  payload: MembershipDirectoryPayload,
  t: TranslateFn,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.y;
  const colW = width / 2;
  const stats = payload.stats;
  const total = stats.total || 1;

  doc
    .save()
    .rect(left, y, colW - 4, SUMMARY_BLOCK_HEIGHT)
    .strokeColor(BORDER)
    .lineWidth(0.75)
    .stroke()
    .restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY);
  doc.text(t("preview.membershipDirectory.summaryTitle").toUpperCase(), left + 8, y + 8);

  const bars = [
    { label: t("preview.membershipDirectory.kpiMembers"), value: stats.members, color: PURPLE },
    { label: t("preview.membershipDirectory.kpiVisits"), value: stats.visits, color: ORANGE },
    { label: t("preview.membershipDirectory.kpiActive"), value: stats.active, color: GREEN },
    { label: t("preview.membershipDirectory.kpiInactive"), value: stats.inactive, color: RED },
  ];

  let by = y + SUMMARY_BARS_TOP;
  for (const bar of bars) {
    const pct = Math.round((bar.value / total) * 1000) / 10;
    doc.font("Helvetica").fontSize(7).fillColor(TEXT);
    doc.text(`${bar.label}  ${bar.value} · ${pct}%`, left + 8, by, {
      width: colW - 20,
      lineBreak: false,
      ellipsis: true,
    });
    const trackY = by + SUMMARY_TRACK_OFFSET;
    const trackW = colW - 24;
    if (pct > 0) {
      doc
        .save()
        .rect(left + 8, trackY, trackW, SUMMARY_TRACK_HEIGHT)
        .fill("#f3f5f8")
        .restore();
      doc
        .save()
        .rect(left + 8, trackY, trackW * (pct / 100), SUMMARY_TRACK_HEIGHT)
        .fill(bar.color)
        .restore();
    }
    by += SUMMARY_BAR_STEP;
  }

  const notesX = left + colW + 4;
  doc
    .save()
    .rect(notesX, y, colW - 4, SUMMARY_BLOCK_HEIGHT)
    .fill(NOTES_BG)
    .strokeColor("#f3dca8")
    .lineWidth(0.75)
    .stroke()
    .restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(NOTES_TEXT);
  doc.text(t("preview.membershipDirectory.importantNotes").toUpperCase(), notesX + 8, y + 8);
  doc.font("Helvetica").fontSize(7).fillColor(NOTES_TEXT);
  doc.text(t("preview.membershipDirectory.notesBodyLine1"), notesX + 8, y + 22, {
    width: colW - 20,
    height: 24,
    lineGap: 1,
    ellipsis: true,
  });
  doc.text(t("preview.membershipDirectory.notesBodyLine2"), notesX + 8, y + 50, {
    width: colW - 20,
    height: 30,
    lineGap: 1,
    ellipsis: true,
  });

  doc.y = y + SUMMARY_BLOCK_HEIGHT;
}

function drawInlinePageFooter(
  doc: InstanceType<typeof PDFDocument>,
  payload: MembershipDirectoryPayload,
  t: TranslateFn,
  pageNum: number,
  totalPages: number,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const churchDisplay =
    payload.churchName?.trim() || FUENTE_INAGOTABLE.churchDisplayName;
  const y = doc.page.height - doc.page.margins.bottom - 10;

  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  doc.text(
    sanitizePdfText(`${churchDisplay} — ${t("preview.membershipDirectory.title")}`),
    left,
    y,
    { width: width * 0.7, align: "left", lineBreak: false },
  );
  doc.text(
    sanitizePdfText(
      t("preview.membershipDirectory.pageOf", {
        page: pageNum,
        total: totalPages,
      }),
    ),
    left,
    y,
    { width, align: "right", lineBreak: false },
  );
}

export function renderMembershipDirectoryFormPdf(
  doc: InstanceType<typeof PDFDocument>,
  payload: MembershipDirectoryPayload,
  locale: Locale,
  t: TranslateFn,
  generatedByName?: string | null,
): void {
  const yesLabel = t("preview.membershipDirectory.yes");
  const noLabel = t("preview.membershipDirectory.no");
  const members = sortMembersByName(payload.members);
  const pages = paginateMembersForPrint(members);
  const columnWidths = directoryColumnWidths(contentWidth(doc));

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    drawHeader(doc, payload, locale, t, generatedByName);

    if (page.kind === "only" || page.kind === "first") {
      drawKpiStrip(doc, payload, t);
    }

    const from = page.members.length > 0 ? page.startIndex + 1 : 0;
    const to = page.startIndex + page.members.length;
    const continued = page.kind === "middle" || page.kind === "last";

    drawTableSectionTitle(doc, continued, from, to, t);
    if (page.members.length > 0) {
      drawTableHeader(doc, columnWidths, t);
      page.members.forEach((member, index) => {
        const row = memberDirectoryRow(member, yesLabel, noLabel);
        drawTableRow(doc, columnWidths, row, page.startIndex + index + 1, index % 2 === 1);
      });
    }

    if (page.kind === "only" || page.kind === "last") {
      drawSummaryAndNotes(doc, payload, t);
    }

    drawInlinePageFooter(doc, payload, t, pageIndex + 1, pages.length);
  });
}

export function createMembershipDirectoryPdfDocument(): InstanceType<typeof PDFDocument> {
  return createLandscapeDocument();
}
