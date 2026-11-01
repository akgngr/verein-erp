import type { LetterheadProfile } from "@/shared/pdf/letterhead";

/**
 * DOSYA FORMATI EKLENTİSİ SÖZLEŞMESİ ("Dosyalarım" / asistanın create_file aracı).
 * Her format aynı içerikten (başlık + markdown) bayt üretir. Bir modül yeni format eklemek için
 * src/modules/<modül>/formats.ts içinde `export const formats = defineFormats("<modül>", [ ... ])`
 * dışa aktarır; `pnpm module:sync` src/format-registry.ts'i üretir. Modül kapalıysa formatı kullanılmaz.
 */
export type FileContent = { title: string; markdown: string; createdAt: Date };

export type RenderContext = {
  /** Yalnızca antetli biçimler (PDF) için; dernek adı, adres, logo. */
  letterhead: () => Promise<LetterheadProfile>;
  strings: { createdAt: string; footer: (page: number, total: number) => string; note: string };
};

export type FileFormatPlugin = {
  /** Küçük harf kimlik (ör. "pdf", "odt"); tüm modüllerde benzersiz olmalı. */
  id: string;
  mimeType: string;
  extension: string;
  /** Asistana gösterilecek kısa açıklama (İngilizce, model için). */
  hint?: string;
  render: (content: FileContent, context: RenderContext) => Promise<Buffer>;
};

export type ModuleFormats = { moduleKey: string; formats: FileFormatPlugin[] };

export const defineFormat = (plugin: FileFormatPlugin) => plugin;
export const defineFormats = (moduleKey: string, formats: FileFormatPlugin[]): ModuleFormats => ({ moduleKey, formats });
