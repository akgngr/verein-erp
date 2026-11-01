import "server-only";

import { moduleFormatRegistry } from "@/format-registry";
import type { FileFormatPlugin } from "@/shared/formats/define";

/**
 * Tüm kayıtlı format eklentileri (modüllerin formats.ts dosyaları). Aynı kimlik iki kez
 * kayıtlıysa ilk gelen (yerleşik) kazanır; üçüncü taraf yerleşik formatı ezemez.
 */
export function allFormats(): { moduleKey: string; plugin: FileFormatPlugin }[] {
  const seen = new Set<string>();
  const ordered = [...moduleFormatRegistry].sort((a, b) => (a.moduleKey === "exports" ? -1 : b.moduleKey === "exports" ? 1 : 0));
  const result: { moduleKey: string; plugin: FileFormatPlugin }[] = [];
  for (const entry of ordered) {
    for (const plugin of entry.formats) {
      if (!/^[a-z0-9]{2,10}$/.test(plugin.id) || seen.has(plugin.id)) continue;
      seen.add(plugin.id);
      result.push({ moduleKey: entry.moduleKey, plugin });
    }
  }
  return result;
}

/** Kimliğe göre format; modül kullanılamıyorsa (kapalı) null. */
export function findFormat(id: string, usableModules: string[]): FileFormatPlugin | null {
  const entry = allFormats().find((item) => item.plugin.id === id);
  return entry && (entry.moduleKey === "exports" || usableModules.includes(entry.moduleKey)) ? entry.plugin : null;
}
