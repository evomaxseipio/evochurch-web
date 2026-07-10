import { fmtRD } from "@/lib/format-currency";
import type { Locale } from "@/i18n/config";
import type { TitheClosePdfPayload } from "@/lib/services/tithe-close";
import PDFDocument from "pdfkit";
import { getTranslations } from "next-intl/server";

function collectPdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function generateTitheClosePdf(
  payload: TitheClosePdfPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const t = await getTranslations({ locale, namespace: "finances.titheClose" });
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const bufferPromise = collectPdfBuffer(doc);

  doc.fontSize(16).text(t("pdfTitle"), { align: "center" });
  doc.moveDown(0.4);
  doc
    .fontSize(10)
    .fillColor("#555555")
    .text(
      [
        payload.churchName,
        `${payload.periodStart} – ${payload.periodEnd}`,
        payload.status === "closed" ? t("statusClosed") : t("statusOpen"),
      ]
        .filter(Boolean)
        .join(" · "),
      { align: "center" },
    );
  doc.fillColor("#000000");
  doc.moveDown(1);

  doc.fontSize(11).font("Helvetica-Bold").text(t("totalTithes"));
  doc.font("Helvetica").fontSize(10).text(fmtRD(payload.baseAmount));
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(11).text(t("allocation"));
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10);
  for (const line of payload.allocation) {
    doc.text(`${line.label}: ${line.percent}% — ${fmtRD(line.amount)}`);
    doc.moveDown(0.1);
  }

  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(11).text(t("contributions"));
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9);
  for (const row of payload.contributions) {
    doc.text(
      `${row.paymentDate} · ${row.memberName || "—"} · ${fmtRD(row.amount)}${row.fundName ? ` (${row.fundName})` : ""}`,
    );
    doc.moveDown(0.08);
  }

  doc.moveDown(1);
  doc.fontSize(8).fillColor("#666666").text(
    t("pdfFooter", {
      date: payload.generatedAt.slice(0, 10),
      closed: payload.status === "closed" ? t("yes") : t("no"),
    }),
    { align: "center" },
  );

  doc.end();
  const buf = await bufferPromise;
  return new Uint8Array(buf);
}

export function titheClosePdfFilename(periodStart: string): string {
  return `cierre-diezmo-${periodStart}.pdf`;
}
