/**
 * Form-style PDF layout: bordered grids, section headings, official headers.
 */
import PDFDocument from "pdfkit";

const BORDER = "#333333";
const HEADER_BG = "#eeeeee";
const TOTAL_BG = "#f5f5f5";
const TEXT = "#1a1d29";
const MUTED = "#555555";

function sanitizePdfText(text: string): string {
  return text.replace(/[\u2212\u2013\u2014]/g, "-");
}

export type PdfFormCellStyle = "normal" | "header" | "label" | "total" | "totalAmount" | "amount";

export type PdfFormCell = {
  text: string;
  colSpan?: number;
  style?: PdfFormCellStyle;
};

export type PdfFormTableRow = PdfFormCell[];

export type PdfFormHeaderLine = {
  text: string;
  size?: number;
  bold?: boolean;
  color?: string;
};

export function createFormPdfDocument(margin = 36): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ margin, size: "A4", bufferPages: true });
}

export function contentWidth(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

export function sixColumnFormWidths(doc: InstanceType<typeof PDFDocument>): number[] {
  const total = contentWidth(doc);
  const concept = Math.floor((total * 2.2) / 9.6);
  const amount = Math.floor(total / 9.6);
  const remainder = total - concept * 3 - amount * 3;
  return [concept, amount, concept, amount, concept, amount + remainder];
}

function cellPresentation(style: PdfFormCellStyle | undefined) {
  switch (style) {
    case "header":
    case "label":
      return { bold: true, fill: HEADER_BG, align: "left" as const };
    case "total":
      return { bold: true, fill: TOTAL_BG, align: "left" as const };
    case "totalAmount":
      return { bold: true, fill: TOTAL_BG, align: "right" as const };
    case "amount":
      return { bold: false, fill: undefined, align: "right" as const };
    default:
      return { bold: false, fill: undefined, align: "left" as const };
  }
}

function ensureVerticalSpace(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  height: number,
): number {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + height <= bottom) return y;
  doc.addPage();
  return doc.page.margins.top;
}

export function drawFormHeader(
  doc: InstanceType<typeof PDFDocument>,
  lines: PdfFormHeaderLine[],
): void {
  const width = contentWidth(doc);
  for (const line of lines) {
    doc
      .font(line.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(line.size ?? 10)
      .fillColor(line.color ?? TEXT)
      .text(line.text, doc.page.margins.left, doc.y, { width, align: "center" });
    doc.moveDown(line.size && line.size >= 13 ? 0.35 : 0.15);
  }
  doc.moveDown(0.45);
}

export function drawSectionHeading(doc: InstanceType<typeof PDFDocument>, title: string): void {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(TEXT)
    .text(title.toUpperCase(), doc.page.margins.left, doc.y, {
      width: contentWidth(doc),
      align: "left",
    });
  doc.moveDown(0.35);
}

export function drawFormTable(
  doc: InstanceType<typeof PDFDocument>,
  columnWidths: number[],
  rows: PdfFormTableRow[],
  options?: { fontSize?: number; padding?: number },
): void {
  const fontSize = options?.fontSize ?? 8;
  const padding = options?.padding ?? 4;
  const x0 = doc.page.margins.left;
  let y = doc.y;

  for (const row of rows) {
    const cells: { text: string; width: number; style?: PdfFormCellStyle }[] = [];
    let colIndex = 0;

    for (const cell of row) {
      const span = cell.colSpan ?? 1;
      let width = 0;
      for (let i = 0; i < span; i += 1) {
        width += columnWidths[colIndex + i] ?? 0;
        colIndex += 1;
      }
      cells.push({ text: sanitizePdfText(cell.text), width, style: cell.style });
    }

    let rowHeight = fontSize + padding * 2;
    for (const cell of cells) {
      const presentation = cellPresentation(cell.style);
      doc.font(presentation.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
      const textHeight = doc.heightOfString(cell.text || " ", {
        width: Math.max(cell.width - padding * 2, 8),
      });
      rowHeight = Math.max(rowHeight, textHeight + padding * 2);
    }

    y = ensureVerticalSpace(doc, y, rowHeight);

    let x = x0;
    for (const cell of cells) {
      const presentation = cellPresentation(cell.style);

      if (presentation.fill) {
        doc.save();
        doc.rect(x, y, cell.width, rowHeight).fill(presentation.fill);
        doc.restore();
      }

      doc.save();
      doc.rect(x, y, cell.width, rowHeight).strokeColor(BORDER).lineWidth(0.75).stroke();
      doc.restore();

      doc
        .font(presentation.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(TEXT)
        .text(cell.text, x + padding, y + padding, {
          width: Math.max(cell.width - padding * 2, 8),
          align: presentation.align,
        });

      x += cell.width;
    }

    y += rowHeight;
  }

  doc.x = doc.page.margins.left;
  doc.y = y;
}

export function drawFormNote(doc: InstanceType<typeof PDFDocument>, text: string): void {
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(text, {
    width: contentWidth(doc),
    align: "left",
  });
  doc.fillColor(TEXT);
}

export function drawFormFooter(
  doc: InstanceType<typeof PDFDocument>,
  parts: string[],
): void {
  doc.moveDown(0.6);
  const y = doc.y;
  const width = contentWidth(doc);
  const gap = 12;
  const partWidth = (width - gap * (parts.length - 1)) / parts.length;

  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.margins.left + width, y)
    .strokeColor(BORDER)
    .lineWidth(0.75)
    .stroke();

  doc.y = y + 8;
  parts.forEach((part, index) => {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(TEXT)
      .text(part, doc.page.margins.left + index * (partWidth + gap), doc.y, {
        width: partWidth,
        align: "left",
      });
  });
  doc.moveDown(0.8);
}
