import { parseMarkdown } from "@/shared/markdown/parse";

import { blockLines, plainText } from "./text";
import { defineFormat } from "./types";

/** Excel (Almanca bölge ayarı) uyumlu: ";" ayırıcı, UTF-8 BOM. Tablolar arası boş satır. */
const quote = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const csvFormat = defineFormat({
  id: "csv",
  mimeType: "text/csv; charset=utf-8",
  extension: "csv",
  render: async ({ markdown }) => {
    const blocks = parseMarkdown(markdown);
    const tables = blocks.filter((block) => block.type === "table");
    const lines = tables.length
      ? tables.flatMap((table, index) => [...(index ? [""] : []), ...[table.header, ...table.rows].map((row) => row.map((cell) => quote(plainText(cell))).join(";"))])
      : blockLines(blocks).map(quote);
    return Buffer.from(`﻿${lines.join("\r\n")}\r\n`, "utf8");
  },
});
