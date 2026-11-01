import "server-only";

import { defineFormats } from "@/shared/formats/define";

import { csvFormat } from "./formats/csv";
import { docxFormat } from "./formats/docx";
import { markdownFormat } from "./formats/md";
import { pdfFormat } from "./formats/pdf";
import { xlsxFormat } from "./formats/xlsx";

/** Yerleşik formatlar; diğer modüller kendi formats.ts dosyalarıyla ekler (src/format-registry.ts). */
export const formats = defineFormats("exports", [pdfFormat, xlsxFormat, docxFormat, markdownFormat, csvFormat]);
