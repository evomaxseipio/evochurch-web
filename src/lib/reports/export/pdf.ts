/**
 * PDF: pdfkit — generación server-side sin árbol React (@react-pdf/renderer).
 * Adecuado para tablas A4 en server actions (REP-2+).
 */
import PDFDocument from "pdfkit";

export type PdfTableColumn = {
  header: string;
  width?: number;
};

export type PdfDocumentOptions = {
  title?: string;
  subtitle?: string;
  margin?: number;
};

export function collectPdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function buildSimplePdf(
  options: PdfDocumentOptions = {},
): Promise<Uint8Array> {
  const doc = new PDFDocument({ margin: options.margin ?? 50 });
  const bufferPromise = collectPdfBuffer(doc);

  if (options.title) {
    doc.fontSize(16).text(options.title, { align: "center" });
    doc.moveDown();
  }
  if (options.subtitle) {
    doc.fontSize(11).fillColor("#444444").text(options.subtitle, {
      align: "center",
    });
    doc.fillColor("#000000");
    doc.moveDown();
  }

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}

export type PdfKeyValueRow = {
  label: string;
  value: string;
};

function writeTableHeader(
  doc: InstanceType<typeof PDFDocument>,
  columns: PdfTableColumn[],
  widths: number[],
): void {
  doc.fontSize(9).font("Helvetica-Bold");
  columns.forEach((col, index) => {
    doc.text(col.header, {
      continued: index < columns.length - 1,
      width: widths[index],
    });
  });
  doc.moveDown(0.5);
  doc.font("Helvetica");
}

export async function buildPdfTablePaginated(
  title: string,
  columns: PdfTableColumn[],
  rows: string[][],
  subtitle?: string,
  rowsPerPage = 32,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const bufferPromise = collectPdfBuffer(doc);

  const colCount = columns.length || 1;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const defaultWidth = pageWidth / colCount;
  const widths = columns.map((col) => col.width ?? defaultWidth);

  const writePageHeader = () => {
    doc.fontSize(14).text(title);
    if (subtitle) {
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#555555").text(subtitle);
      doc.fillColor("#000000");
    }
    doc.moveDown(0.6);
    writeTableHeader(doc, columns, widths);
  };

  writePageHeader();
  let rowCount = 0;

  for (const row of rows) {
    if (rowCount >= rowsPerPage) {
      doc.addPage();
      writePageHeader();
      rowCount = 0;
    }
    row.forEach((cell, index) => {
      doc.fontSize(8).text(cell ?? "", {
        continued: index < row.length - 1,
        width: widths[index] ?? defaultWidth,
      });
    });
    doc.moveDown(0.25);
    rowCount += 1;
  }

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}

export async function buildPdfKeyValueForm(
  title: string,
  subtitle: string | undefined,
  sections: { heading?: string; rows: PdfKeyValueRow[] }[],
  footerNote?: string,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const bufferPromise = collectPdfBuffer(doc);

  doc.fontSize(15).text(title, { align: "center" });
  if (subtitle) {
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#555555").text(subtitle, { align: "center" });
    doc.fillColor("#000000");
  }
  doc.moveDown(1);

  for (const section of sections) {
    if (section.heading) {
      doc.fontSize(11).font("Helvetica-Bold").text(section.heading);
      doc.moveDown(0.4);
      doc.font("Helvetica");
    }
    for (const row of section.rows) {
      doc.fontSize(9).font("Helvetica-Bold").text(row.label, { continued: true });
      doc.font("Helvetica").text(`  ${row.value}`);
      doc.moveDown(0.15);
    }
    doc.moveDown(0.5);
  }

  if (footerNote) {
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor("#666666").text(footerNote, { align: "center" });
  }

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}

export async function buildPdfTable(
  title: string,
  columns: PdfTableColumn[],
  rows: string[][],
  subtitle?: string,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const bufferPromise = collectPdfBuffer(doc);

  doc.fontSize(14).text(title);
  if (subtitle) {
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555555").text(subtitle);
    doc.fillColor("#000000");
  }
  doc.moveDown();

  const colCount = columns.length || 1;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const defaultWidth = pageWidth / colCount;
  const widths = columns.map((col) => col.width ?? defaultWidth);

  doc.fontSize(9).font("Helvetica-Bold");
  columns.forEach((col, index) => {
    doc.text(col.header, { continued: index < columns.length - 1, width: widths[index] });
  });
  doc.moveDown(0.5);
  doc.font("Helvetica");

  for (const row of rows) {
    row.forEach((cell, index) => {
      doc.text(cell ?? "", {
        continued: index < row.length - 1,
        width: widths[index] ?? defaultWidth,
      });
    });
    doc.moveDown(0.3);
  }

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}
