import "server-only";

import { csvFormat } from "./csv";
import { docxFormat } from "./docx";
import { markdownFormat } from "./md";
import { pdfFormat } from "./pdf";
import type { FileFormatId, FileFormatPlugin } from "./types";
import { xlsxFormat } from "./xlsx";

/** Kayıtlı format eklentileri. Yeni format: formats/<ad>.ts + bu listeye bir satır + FILE_FORMATS. */
export const FORMAT_PLUGINS: Record<FileFormatId, FileFormatPlugin> = {
  pdf: pdfFormat,
  xlsx: xlsxFormat,
  docx: docxFormat,
  md: markdownFormat,
  csv: csvFormat,
};
