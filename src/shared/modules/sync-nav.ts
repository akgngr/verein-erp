import fs from "node:fs";
import path from "node:path";

export type ModuleNavJson = {
  categoryGroup: "association" | "finance" | "education" | "communication" | "operations";
  parentModule?: string;
  order?: number;
};

/**
 * Her modülün kendi `nav.json` dosyasını okuyup
 * `src/shared/navigation/nav-defaults.generated.ts` dosyasını üretir.
 * Modüller arası sıfır bağımlılık ve zero-touch kuralını korur.
 */
export function syncModuleNavDefaults(rootDir = process.cwd()): { count: number } {
  const modulesDir = path.join(rootDir, "src/modules");
  const outPath = path.join(rootDir, "src/shared/navigation/nav-defaults.generated.ts");

  const entries: Record<string, ModuleNavJson> = {};
  if (fs.existsSync(modulesDir)) {
    const dirs = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const key of dirs) {
      const navPath = path.join(modulesDir, key, "nav.json");
      if (!fs.existsSync(navPath)) continue;
      const parsed = JSON.parse(fs.readFileSync(navPath, "utf8")) as ModuleNavJson;
      entries[key] = {
        categoryGroup: parsed.categoryGroup,
        ...(parsed.parentModule ? { parentModule: parsed.parentModule } : {}),
        ...(typeof parsed.order === "number" ? { order: parsed.order } : {}),
      };
    }
  }

  const content = [
    "// Bu dosya scripts/sync-schemas.ts (syncModuleNavDefaults) tarafından otomatik üretilir.",
    "// Her modül kendi src/modules/<modül>/nav.json dosyasında varsayılan kategori ve alt modül bilgisini tutar.",
    "",
    'import type { NavCategoryId } from "../types/module";',
    "",
    "export type ModuleNavDefault = {",
    "  categoryGroup: NavCategoryId;",
    "  parentModule?: string;",
    "  order?: number;",
    "};",
    "",
    `export const MODULE_NAV_DEFAULTS: Record<string, ModuleNavDefault> = ${JSON.stringify(entries, null, 2)};`,
    "",
  ].join("\n");

  const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (prev !== content) {
    fs.writeFileSync(outPath, content, "utf8");
  }

  return { count: Object.keys(entries).length };
}
