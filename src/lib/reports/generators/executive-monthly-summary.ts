import PDFDocument from "pdfkit";
import { fmtRD } from "@/lib/format-currency";
import type { Locale } from "@/i18n/config";
import type { ExecutiveMonthlyPayload } from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";

function collectPdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function generateExecutiveMonthlySummaryPdf(
  payload: ExecutiveMonthlyPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const bufferPromise = collectPdfBuffer(doc);

  doc.fontSize(16).text(tReports("exports.executiveMonthlySummary.title"), { align: "center" });
  doc.moveDown(0.4);
  doc
    .fontSize(10)
    .fillColor("#555555")
    .text(
      [
        payload.churchName,
        payload.periodLabel,
        tReports("exports.executiveMonthlySummary.generatedOn", {
          date: payload.generatedAt.slice(0, 10),
        }),
      ]
        .filter(Boolean)
        .join(" · "),
      { align: "center" },
    );
  doc.fillColor("#000000");
  doc.moveDown(1);

  doc.fontSize(11).font("Helvetica-Bold").text(tReports("exports.executiveMonthlySummary.keyIndicators"));
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10);

  for (const kpi of payload.kpis) {
    const delta = kpi.delta ? ` (${kpi.delta})` : "";
    doc.text(`${kpi.label}: ${kpi.value}${delta}`);
    doc.moveDown(0.12);
  }

  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(11).text(tReports("exports.executiveMonthlySummary.contributionsByCategory"));
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10);
  doc.text(`${tReports("cead.incomeLines.tithes")}: ${fmtRD(payload.contributionBreakdown.tithe)}`);
  doc.text(`${tReports("cead.incomeLines.voluntaryOfferings")}: ${fmtRD(payload.contributionBreakdown.offering)}`);
  doc.text(`${tReports("exports.executiveMonthlySummary.donations")}: ${fmtRD(payload.contributionBreakdown.donation)}`);
  doc.text(`${tReports("exports.executiveMonthlySummary.total")}: ${fmtRD(payload.contributionBreakdown.total)}`);

  if (payload.councilLines.length > 0) {
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(11).text(tReports("exports.executiveMonthlySummary.councilSends"));
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10);
    for (const line of payload.councilLines) {
      const formula = line.formula ? ` (${line.formula})` : "";
      doc.text(`${line.label}: ${fmtRD(line.amount)}${formula}`);
      doc.moveDown(0.12);
    }
    const councilTotal = payload.councilLines.reduce((sum, line) => sum + line.amount, 0);
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text(
      `${tReports("exports.executiveMonthlySummary.councilSendsTotal")}: ${fmtRD(councilTotal)}`,
    );
    doc.font("Helvetica");
  }

  doc.moveDown(0.6);
  doc.fontSize(9).fillColor("#666666").text(
    tReports("exports.executiveMonthlySummary.footerNote"),
    { align: "left" },
  );

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}
