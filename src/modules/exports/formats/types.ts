import type { LetterheadProfile } from "@/shared/pdf/letterhead";

/**
 * FORMAT EKLENTİSİ SÖZLEŞMESİ: her format aynı içerikten (başlık + markdown) bayt üretir.
 * Yeni format = bu klasöre bir dosya + formats/index.ts listesine bir satır.
 */
export const FILE_FORMATS = ["pdf", "xlsx", "docx", "md", "csv"] as const;
export type FileFormatId = (typeof FILE_FORMATS)[number];

export type FileContent = { title: string; markdown: string; createdAt: Date };

export type RenderContext = {
  /** Yalnızca antetli biçimler (PDF) için; dernek adı, adres, logo. */
  letterhead: () => Promise<LetterheadProfile>;
  strings: { createdAt: string; footer: (page: number, total: number) => string; note: string };
};

export type FileFormatPlugin = {
  id: FileFormatId;
  mimeType: string;
  extension: string;
  render: (content: FileContent, context: RenderContext) => Promise<Buffer>;
};

export const defineFormat = (plugin: FileFormatPlugin) => plugin;
