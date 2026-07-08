/**
 * PDF CEAD mensual — replica `CeadFinancialMonthlyFormPrint` (header, KPIs,
 * ingresos | egresos | gráfico, concilio 5 cols, notas, footer).
 */
import fs from "node:fs";
import path from "node:path";
import type PDFDocument from "pdfkit";
import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/i18n/format";
import {
  contentWidth,
  drawFormTable,
  type PdfFormTableRow,
} from "@/lib/reports/export/pdf-form";
import {
  CEAD_CHART_SCALE,
  CEAD_COUNCIL_PERCENT,
  councilCalculationBaseAmount,
  councilCalculationBaseLabel,
  councilFormulaDetail,
  translateCeadLineLabel,
} from "@/lib/reports/templates/cead/form-helpers";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

const NAVY = "#1e2a5e";
const MUTED = "#9198a8";
const TEXT = "#1a1d29";
const BORDER = "#e5e8ee";
const GOLD = "#b8863b";
const GREEN = "#15803d";
const GREEN_BG = "#e9f7ee";
const RED = "#c0281c";
const RED_BG = "#fdecea";
const BLUE = "#2563eb";
const COUNCIL_PURPLE = "#5b3fb0";
const COUNCIL_HEAD_BG = "#f0ecfc";
const NOTES_BG = "#fdf1de";
const NOTES_BORDER = "#f3dca8";
const NOTES_TEXT = "#8a5a12";

function sanitizePdfText(text: string): string {
  return text.replace(/[\u2212\u2013\u2014]/g, "-");
}

function resolvePublicAsset(relativePath: string): string {
  return path.join(process.cwd(), "public", relativePath.replace(/^\//, ""));
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, y: number, height: number): number {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + height <= bottom) return y;
  doc.addPage();
  return doc.page.margins.top;
}

function row3ColumnWidths(doc: InstanceType<typeof PDFDocument>): [number, number, number] {
  const gap = 12;
  const total = contentWidth(doc) - gap * 2;
  const unit = total / 2.85;
  return [unit, unit, unit * 0.85];
}

function councilColumnWidths(doc: InstanceType<typeof PDFDocument>): number[] {
  const total = contentWidth(doc);
  const destino = Math.floor(total * 0.22);
  const porcentaje = Math.floor(total * 0.1);
  const base = Math.floor(total * 0.22);
  const monto = Math.floor(total * 0.14);
  const formula = total - destino - porcentaje - base - monto;
  return [destino, porcentaje, base, monto, formula];
}

function chartTickLabel(value: number, locale: Locale): string {
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return formatNumber(value, locale, { maximumFractionDigits: 0 });
}

function measureLedgerCardHeight(lineCount: number): number {
  return 22 + 16 + lineCount * 17 + 22;
}

function drawCeadHeader(
  doc: InstanceType<typeof PDFDocument>,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: TranslateFn,
  treasurerName?: string | null,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y0 = ensureSpace(doc, doc.y, 72);
  const churchDisplay =
    payload.churchName?.trim() || FUENTE_INAGOTABLE.churchDisplayName;
  const pastorDisplay = payload.pastorName?.trim() || "-";
  const treasurerDisplay = treasurerName?.trim() || "-";
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const logoPath = resolvePublicAsset(brandLogoForSurface("document"));
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, left, y0, { width: 52, height: 52 });
  }

  const textX = left + 66;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(NAVY).text(
    sanitizePdfText(t("preview.ceadMonthly.title")),
    textX,
    y0,
    { width: width - 66 - 210 },
  );
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(
    sanitizePdfText(churchDisplay),
    textX,
    y0 + 20,
    { width: width - 66 - 210 },
  );
  doc.font("Helvetica").fontSize(10).fillColor("#5b6072").text(
    sanitizePdfText(payload.cead.periodLabel),
    textX,
    y0 + 34,
  );
  doc.text(
    sanitizePdfText(`${t("preview.ceadMonthly.pastor")}: ${pastorDisplay}`),
    textX,
    y0 + 46,
  );

  const boxW = 200;
  const boxX = left + width - boxW;
  const boxH = 52;
  doc.save().roundedRect(boxX, y0, boxW, boxH, 6).fill("#f3f5f8").stroke(BORDER).restore();
  doc.font("Helvetica").fontSize(9).fillColor("#5b6072").text(
    sanitizePdfText(`${t("preview.ceadMonthly.generatedAt")}: ${generatedLabel}`),
    boxX + 10,
    y0 + 10,
    { width: boxW - 20 },
  );
  doc.text(
    sanitizePdfText(`${t("preview.ceadMonthly.treasurer")}: ${treasurerDisplay}`),
    boxX + 10,
    y0 + 28,
    { width: boxW - 20 },
  );

  const ruleY = y0 + 64;
  doc.save().moveTo(left, ruleY).lineTo(left + width, ruleY).strokeColor(GOLD).lineWidth(2).stroke().restore();
  doc.x = left;
  doc.y = ruleY + 14;
}

function drawCeadKpis(
  doc: InstanceType<typeof PDFDocument>,
  items: { label: string; value: string; labelColor: string }[],
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = ensureSpace(doc, doc.y, 48);
  const colW = width / items.length;
  const rowH = 44;

  doc.save().rect(left, y, width, rowH).stroke(BORDER).restore();

  items.forEach((item, index) => {
    const x = left + index * colW;
    if (index > 0) {
      doc.save().moveTo(x, y).lineTo(x, y + rowH).stroke(BORDER).restore();
    }
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(item.labelColor).text(
      sanitizePdfText(item.label.toUpperCase()),
      x + 10,
      y + 10,
      { width: colW - 20 },
    );
    doc.font("Helvetica-Bold").fontSize(12).fillColor(item.labelColor).text(
      sanitizePdfText(item.value),
      x + 10,
      y + 24,
      { width: colW - 20, align: "right" },
    );
  });

  doc.y = y + rowH + 12;
}

function drawLedgerCard(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    title: string;
    titleColor: string;
    conceptHeader: string;
    amountHeader: string;
    lines: { label: string; amount: string }[];
    totalLabel: string;
    totalAmount: string;
    footerBg: string;
    footerColor: string;
  },
): void {
  const padH = 10;
  const headerH = 22;
  const theadH = 14;
  const rowH = 17;
  const footerH = 22;

  doc.save().rect(x, y, width, height).stroke(BORDER).restore();
  doc.save().rect(x, y, width, headerH).fill("#fafbfc").restore();
  doc.save().moveTo(x, y + headerH).lineTo(x + width, y + headerH).stroke(BORDER).restore();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(options.titleColor).text(
    sanitizePdfText(options.title.toUpperCase()),
    x + padH,
    y + 7,
    { width: width - padH * 2 },
  );

  let cy = y + headerH;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED).text(
    sanitizePdfText(options.conceptHeader.toUpperCase()),
    x + padH,
    cy + 3,
    { width: width * 0.62 },
  );
  doc.text(sanitizePdfText(options.amountHeader.toUpperCase()), x + width * 0.62, cy + 3, {
    width: width * 0.38 - padH,
    align: "right",
  });
  cy += theadH;

  doc.font("Helvetica").fontSize(9).fillColor(TEXT);
  for (const line of options.lines) {
    doc.save().moveTo(x, cy + rowH).lineTo(x + width, cy + rowH).stroke("#eef0f3").restore();
    doc.text(sanitizePdfText(line.label), x + padH, cy + 4, { width: width * 0.62 - padH });
    doc.text(sanitizePdfText(line.amount), x + width * 0.62, cy + 4, {
      width: width * 0.38 - padH,
      align: "right",
    });
    cy += rowH;
  }

  doc.save().rect(x, y + height - footerH, width, footerH).fill(options.footerBg).restore();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(options.footerColor).text(
    sanitizePdfText(options.totalLabel),
    x + padH,
    y + height - footerH + 7,
    { width: width * 0.62 - padH },
  );
  doc.text(sanitizePdfText(options.totalAmount), x + width * 0.62, y + height - footerH + 7, {
    width: width * 0.38 - padH,
    align: "right",
  });
}

function drawChartCard(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: TranslateFn,
): void {
  const { cead } = payload;
  const headerH = 22;
  const balanceH = 26;
  const chartAreaH = height - headerH - balanceH - 16;

  doc.save().rect(x, y, width, height).stroke(BORDER).restore();
  doc.save().rect(x, y, width, headerH).fill("#fafbfc").restore();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLUE).text(
    sanitizePdfText(t("preview.ceadMonthly.chartTitle").toUpperCase()),
    x + 10,
    y + 7,
    { width: width - 20 },
  );

  const chartTop = y + headerH + 8;
  const chartBottom = chartTop + chartAreaH - 24;
  const ticks = [800_000, 600_000, 400_000, 200_000, 0];
  doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
  ticks.forEach((tick, index) => {
    const ty = chartTop + (index / (ticks.length - 1)) * (chartBottom - chartTop);
    doc.save().moveTo(x + 28, ty).lineTo(x + width - 8, ty).stroke("#eef0f3").restore();
    doc.text(chartTickLabel(tick, locale), x + 4, ty - 4, { width: 22, align: "right" });
  });

  const incomePct = Math.min((cead.totalIncome / CEAD_CHART_SCALE) * 100, 100);
  const expensePct = Math.min((cead.totalExpense / CEAD_CHART_SCALE) * 100, 100);
  const barAreaW = width - 48;
  const barW = barAreaW * 0.38;
  const gap = barAreaW * 0.24;
  const barBaseY = chartBottom;
  const maxBarH = chartBottom - chartTop;

  const incomeH = Math.max((incomePct / 100) * maxBarH, 4);
  const expenseH = Math.max((expensePct / 100) * maxBarH, 4);
  const incomeX = x + 32;
  const expenseX = incomeX + barW + gap;

  const incomeLabel = formatNumber(cead.totalIncome, locale, { maximumFractionDigits: 0 });
  const expenseLabel = formatNumber(cead.totalExpense, locale, { maximumFractionDigits: 0 });

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(GREEN).text(incomeLabel, incomeX, barBaseY - incomeH - 12, {
    width: barW,
    align: "center",
  });
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(RED).text(expenseLabel, expenseX, barBaseY - expenseH - 12, {
    width: barW,
    align: "center",
  });

  doc.save().rect(incomeX, barBaseY - incomeH, barW, incomeH).fill("#1c9a52").restore();
  doc.save().rect(expenseX, barBaseY - expenseH, barW, expenseH).fill("#dc2626").restore();

  doc.font("Helvetica").fontSize(7).fillColor(TEXT).text(
    sanitizePdfText(t("preview.ceadMonthly.chartIncome")),
    incomeX,
    barBaseY + 4,
    { width: barW, align: "center" },
  );
  doc.text(sanitizePdfText(t("preview.ceadMonthly.chartExpense")), expenseX, barBaseY + 4, {
    width: barW,
    align: "center",
  });

  const balanceY = y + height - balanceH;
  doc.save().rect(x + 8, balanceY, width - 16, balanceH - 6).fill("#f3f5f8").stroke(BORDER).restore();
  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(
    sanitizePdfText(t("preview.ceadMonthly.kpiNetBalance")),
    x + 14,
    balanceY + 8,
    { width: width * 0.55 },
  );
  doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text(
    sanitizePdfText(formatCurrency(cead.netBalance, locale)),
    x + width * 0.45,
    balanceY + 7,
    { width: width * 0.5 - 14, align: "right" },
  );
}

function drawCouncilSection(
  doc: InstanceType<typeof PDFDocument>,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: TranslateFn,
  councilTotal: number,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = ensureSpace(doc, doc.y, 60);
  const headerH = 22;

  doc.save().rect(left, y, width, headerH).fill(COUNCIL_HEAD_BG).stroke(BORDER).restore();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COUNCIL_PURPLE).text(
    sanitizePdfText(t("preview.ceadMonthly.sectionCouncil").toUpperCase()),
    left + 10,
    y + 7,
    { width: width - 20 },
  );

  doc.y = y + headerH;
  const cols = councilColumnWidths(doc);
  const rows: PdfFormTableRow[] = [
    [
      { text: t("preview.ceadMonthly.destination"), style: "header" },
      { text: t("preview.ceadMonthly.percentage"), style: "header" },
      { text: t("preview.ceadMonthly.calculationBase"), style: "header" },
      { text: t("preview.ceadMonthly.amountRd"), style: "header" },
      { text: t("preview.ceadMonthly.formula"), style: "header" },
    ],
    ...payload.cead.councilLines.map((line) => [
      { text: translateCeadLineLabel(line.label, t) },
      {
        text: CEAD_COUNCIL_PERCENT[line.label as keyof typeof CEAD_COUNCIL_PERCENT] ?? "-",
        style: "amount",
      },
      {
        text: `${councilCalculationBaseLabel(line, payload, t)}\n${formatCurrency(councilCalculationBaseAmount(line, payload), locale)}`,
      },
      { text: formatCurrency(line.amount, locale), style: "amount" },
      { text: councilFormulaDetail(line, payload, locale, t) },
    ] satisfies PdfFormTableRow),
    [
      { text: t("preview.ceadMonthly.totalCouncilSends"), colSpan: 3, style: "total" },
      { text: formatCurrency(councilTotal, locale), style: "totalAmount" },
      { text: "" },
    ],
  ];

  drawFormTable(doc, cols, rows, { fontSize: 7.5, padding: 4 });

  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
    sanitizePdfText(t("preview.ceadMonthly.councilFootnote")),
    left + 10,
    doc.y + 4,
    { width: width - 20 },
  );
  doc.moveDown(0.6);
}

function drawNotesSection(doc: InstanceType<typeof PDFDocument>, t: TranslateFn): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = ensureSpace(doc, doc.y, 56);
  const note1 = sanitizePdfText(t("preview.ceadMonthly.notesBodyLine1"));
  const note2 = sanitizePdfText(t("preview.ceadMonthly.notesBodyLine2"));
  const title = sanitizePdfText(t("preview.ceadMonthly.importantNotes"));

  doc.font("Helvetica").fontSize(9);
  const innerW = width - 24;
  const h =
    28 +
    doc.heightOfString(note1, { width: innerW }) +
    doc.heightOfString(note2, { width: innerW });

  doc.save().rect(left, y, width, h).fill(NOTES_BG).stroke(NOTES_BORDER).restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(NOTES_TEXT).text(title, left + 12, y + 10, {
    width: innerW,
  });
  doc.font("Helvetica").fontSize(8).fillColor(NOTES_TEXT).text(note1, left + 12, y + 24, {
    width: innerW,
  });
  doc.text(note2, left + 12, y + 24 + doc.heightOfString(note1, { width: innerW }) + 4, {
    width: innerW,
  });
  doc.y = y + h + 10;
}

function drawCeadFooter(
  doc: InstanceType<typeof PDFDocument>,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: TranslateFn,
  treasurerName?: string | null,
): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = ensureSpace(doc, doc.y, 24);
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const treasurerDisplay = treasurerName?.trim() || "-";
  const parts = [
    `${t("preview.ceadMonthly.generatedAt")}: ${generatedLabel}`,
    t("preview.ceadMonthly.pageOf", { page: 1, total: 1 }),
    `${t("preview.ceadMonthly.treasurer")}: ${treasurerDisplay}`,
  ];
  const partW = (width - 24) / parts.length;

  doc.save().moveTo(left, y).lineTo(left + width, y).stroke(BORDER).restore();
  parts.forEach((part, index) => {
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
      sanitizePdfText(part),
      left + index * (partW + 12),
      y + 8,
      { width: partW, align: "left" },
    );
  });
  doc.y = y + 24;
}

export function renderCeadMonthlyFormPdf(
  doc: InstanceType<typeof PDFDocument>,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: TranslateFn,
  treasurerName?: string | null,
): void {
  const { cead } = payload;
  const councilTotal = cead.councilLines.reduce((sum, line) => sum + line.amount, 0);

  drawCeadHeader(doc, payload, locale, t, treasurerName);

  drawCeadKpis(doc, [
    {
      label: t("preview.ceadMonthly.kpiTotalIncome"),
      value: formatCurrency(cead.totalIncome, locale),
      labelColor: GREEN,
    },
    {
      label: t("preview.ceadMonthly.kpiTotalExpense"),
      value: formatCurrency(cead.totalExpense, locale),
      labelColor: RED,
    },
    {
      label: t("preview.ceadMonthly.kpiNetBalance"),
      value: formatCurrency(cead.netBalance, locale),
      labelColor: NAVY,
    },
    {
      label: t("preview.ceadMonthly.kpiCouncilSends"),
      value: formatCurrency(councilTotal, locale),
      labelColor: "#c2660a",
    },
  ]);

  const [wIncome, wExpense, wChart] = row3ColumnWidths(doc);
  const gap = 12;
  const left = doc.page.margins.left;
  const rowH = Math.max(
    measureLedgerCardHeight(cead.incomeLines.length),
    measureLedgerCardHeight(cead.expenseLines.length),
    180,
  );
  const yRow = ensureSpace(doc, doc.y, rowH);

  drawLedgerCard(doc, left, yRow, wIncome, rowH, {
    title: t("preview.ceadMonthly.sectionIncome"),
    titleColor: GREEN,
    conceptHeader: t("preview.ceadMonthly.concept"),
    amountHeader: t("preview.ceadMonthly.amountRd"),
    lines: cead.incomeLines.map((line) => ({
      label: translateCeadLineLabel(line.label, t),
      amount: formatCurrency(line.amount, locale),
    })),
    totalLabel: t("preview.ceadMonthly.totalIncome"),
    totalAmount: formatCurrency(cead.totalIncome, locale),
    footerBg: GREEN_BG,
    footerColor: GREEN,
  });

  drawLedgerCard(doc, left + wIncome + gap, yRow, wExpense, rowH, {
    title: t("preview.ceadMonthly.sectionExpense"),
    titleColor: RED,
    conceptHeader: t("preview.ceadMonthly.concept"),
    amountHeader: t("preview.ceadMonthly.amountRd"),
    lines: cead.expenseLines.map((line) => ({
      label: translateCeadLineLabel(line.label, t),
      amount: formatCurrency(line.amount, locale),
    })),
    totalLabel: t("preview.ceadMonthly.totalExpense"),
    totalAmount: formatCurrency(cead.totalExpense, locale),
    footerBg: RED_BG,
    footerColor: RED,
  });

  drawChartCard(
    doc,
    left + wIncome + gap + wExpense + gap,
    yRow,
    wChart,
    rowH,
    payload,
    locale,
    t,
  );

  doc.y = yRow + rowH + 12;
  drawCouncilSection(doc, payload, locale, t, councilTotal);
  drawNotesSection(doc, t);
  drawCeadFooter(doc, payload, locale, t, treasurerName);
}
