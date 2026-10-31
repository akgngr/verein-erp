import ExcelJS from "exceljs";

import { parseMarkdown } from "@/shared/markdown/parse";

import { blockLines, parseNumber, plainText } from "./text";
import { defineFormat } from "./types";

/** Her tablo ayrı sayfa; sayılar gerçek sayı hücresi olur. Tablo yoksa metin satırları. */
export const xlsxFormat = defineFormat({
  id: "xlsx",
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  extension: "xlsx",
  render: async ({ title, markdown }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    const blocks = parseMarkdown(markdown);
    const tables = blocks.filter((block) => block.type === "table");
    const sheetName = (index: number) => (tables.length > 1 ? `${title.slice(0, 26)} ${index + 1}` : title.slice(0, 31)).replace(/[\\/*?:[\]]/g, " ") || "Sheet";
    if (!tables.length) {
      const sheet = workbook.addWorksheet(sheetName(0));
      blockLines(blocks).forEach((line) => sheet.addRow([line]));
      sheet.getColumn(1).width = 100;
    }
    tables.forEach((table, index) => {
      const sheet = workbook.addWorksheet(sheetName(index));
      const header = sheet.addRow(table.header.map(plainText));
      header.font = { bold: true };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
      for (const row of table.rows) sheet.addRow(row.map((cell) => parseNumber(cell) ?? plainText(cell)));
      table.header.forEach((_, column) => {
        const values = [table.header[column], ...table.rows.map((row) => row[column] ?? "")].map((cell) => plainText(cell).length);
        sheet.getColumn(column + 1).width = Math.min(60, Math.max(10, ...values) + 2);
        if (table.align[column] === "right") sheet.getColumn(column + 1).alignment = { horizontal: "right" };
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  },
});
