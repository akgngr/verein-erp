import path from "node:path";
import { pathToFileURL } from "node:url";
import { syncModuleSchemas } from "../src/shared/modules/sync-schemas";
import { syncModuleTranslations } from "../src/shared/modules/sync-i18n";

export { syncModuleSchemas, syncModuleTranslations };

// Komut satırından doğrudan çalıştırıldığında:
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1] === import.meta.filename ||
    pathToFileURL(process.argv[1]).href === import.meta.url ||
    path.basename(process.argv[1]).includes("sync-schemas"));

if (isDirectExecution) {
  const schemaRes = syncModuleSchemas();
  const i18nRes = syncModuleTranslations();
  console.log(
    `[sync] ${schemaRes.synced.length} şema bağlandı (${schemaRes.removed.length} temizlendi) | Modül çevirileri (${Object.keys(i18nRes.modulesMerged).join(", ")}) güncellendi.`,
  );
}
