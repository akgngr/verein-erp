import { neutralizeCsvFormula } from "@/shared/files/csv-formula";
import { parseMarkdown } from "@/shared/markdown/parse";

import { blockLines, plainText } from "./text";
import { defineFormat } from "./types";

/** Excel (Almanca bölge ayarı) uyumlu: ";" ayırıcı, UTF-8 BOM. Tablolar arası boş satır. */
export function safeCsvCell(value: string): string {
  // Only strict signed numeric literals may retain a leading minus sign (shared/files/csv-formula.ts).
  const safe = neutralizeCsvFormula(value);
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const csvFormat = defineFormat({
  id: "csv",
  mimeType: "text/csv; charset=utf-8",
  extension: "csv",
  render: async ({ markdown }) => {
    const blocks = parseMarkdown(markdown);
    const tables = blocks.filter((block) => block.type === "table");
    const lines = tables.length
      ? tables.flatMap((table, index) => [...(index ? [""] : []), ...[table.header, ...table.rows].map((row) => row.map((cell) => safeCsvCell(plainText(cell))).join(";"))])
      : blockLines(blocks).map(safeCsvCell);
    return Buffer.from(`﻿${lines.join("\r\n")}\r\n`, "utf8");
  },
});
