import path from "node:path";
import { pathToFileURL } from "node:url";
import { syncModuleSchemas } from "../src/shared/modules/sync-schemas";
import { syncModuleTranslations } from "../src/shared/modules/sync-i18n";
import { syncModuleRegistry } from "../src/shared/modules/sync-registry";
import { syncModuleRoutes } from "../src/shared/modules/sync-routes";

export { syncModuleSchemas, syncModuleTranslations, syncModuleRegistry, syncModuleRoutes };

// Komut satırından doğrudan çalıştırıldığında:
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1] === import.meta.filename ||
    pathToFileURL(process.argv[1]).href === import.meta.url ||
    path.basename(process.argv[1]).includes("sync-schemas"));

if (isDirectExecution) {
  const schemaRes = syncModuleSchemas();
  const i18nRes = syncModuleTranslations();
  const regRes = syncModuleRegistry();
  const routeRes = syncModuleRoutes();
  console.log(
    `[sync] ${schemaRes.synced.length} şema | Çeviriler (${Object.keys(i18nRes.modulesMerged).join(", ")}) | ${regRes.registered.length} modül | ${routeRes.syncedRoutes.length} rota ${routeRes.rebuilt ? "(modül rotaları yeniden kuruldu)" : "(güncel)"}.`,
  );
  if (routeRes.cleanedRoutes.length > 0) {
    console.log(`[sync] Eski düzenden ${routeRes.cleanedRoutes.length} köprü kaldırıldı (artık (modules) klasöründe).`);
  }
}
