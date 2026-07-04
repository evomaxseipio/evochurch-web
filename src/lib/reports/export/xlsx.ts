/**
 * XLSX: exceljs — estilos de celda y plantillas CEAD (REP-2+).
 * Alternativa descartada: sheetjs/xlsx (menos control de layout).
 */
import ExcelJS from "exceljs";

export type XlsxCellValue = string | number | boolean | null | undefined;

export async function createWorkbook(
  creator = "EvoChurch",
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creator;
  workbook.created = new Date();
  return workbook;
}

export async function workbookToBuffer(
  workbook: ExcelJS.Workbook,
): Promise<Uint8Array> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function addSheetWithRows(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  headers: string[],
  rows: XlsxCellValue[][],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }
  return sheet;
}

export async function buildSimpleXlsx(
  sheetName: string,
  headers: string[],
  rows: XlsxCellValue[][],
  title?: string,
): Promise<Uint8Array> {
  const workbook = await createWorkbook();
  if (title) {
    const meta = workbook.addWorksheet("Meta");
    meta.addRow(["Título", title]);
    meta.addRow(["Generado", new Date().toISOString()]);
  }
  addSheetWithRows(workbook, sheetName, headers, rows);
  return workbookToBuffer(workbook);
}
