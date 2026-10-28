import fs from "node:fs";
import path from "node:path";
import { syncModuleSchemas } from "../src/shared/modules/sync-schemas";
import { syncModuleTranslations } from "../src/shared/modules/sync-i18n";
import { syncModuleRegistry } from "../src/shared/modules/sync-registry";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const APP_DIR = path.join(ROOT_DIR, "src", "app", "(dashboard)");

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toPascalCase(s: string) {
  return s
    .split(/[-_]/)
    .map((part) => capitalize(part))
    .join("");
}

export function scaffoldModule(moduleKey: string, options: { label?: string; description?: string } = {}) {
  const cleanKey = moduleKey.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!cleanKey) {
    throw new Error("Geçerli bir modül anahtarı belirtilmelidir (örn: inventory, sponsors).");
  }

  const moduleDir = path.join(MODULES_DIR, cleanKey);
  if (fs.existsSync(moduleDir)) {
    throw new Error(`Modül dizini zaten mevcut: ${moduleDir}`);
  }

  const label = options.label || capitalize(cleanKey);
  const description = options.description || `${label} yönetim modülü.`;
  const pascalName = toPascalCase(cleanKey);

  // Klasörleri oluştur
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "prisma"), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "menu"), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "messages"), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "views"), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "components"), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "actions"), { recursive: true });
  fs.mkdirSync(path.join(moduleDir, "queries"), { recursive: true });

  // 0. menu/top.json
  const topMenu = [
    {
      key: "overview",
      label: "Genel Bakış",
      href: `/${cleanKey}`,
      icon: "LayoutGrid"
    }
  ];
  fs.writeFileSync(path.join(moduleDir, "menu", "top.json"), JSON.stringify(topMenu, null, 2) + "\n", "utf8");

  // 1. permissions.ts
  const permissionsCode = `import { definePermissions } from "@/shared/permissions/define";

export const ${cleanKey}Permissions = definePermissions("${cleanKey}", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  VIEWER: ["view"],
});
`;
  fs.writeFileSync(path.join(moduleDir, "permissions.ts"), permissionsCode, "utf8");

  // 2. module.config.ts
  const configCode = `import { Package } from "lucide-react";
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { ${cleanKey}Permissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "${cleanKey}",
  label: "${label}",
  description: "${description}",
  category: "EXTENSION",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
  nav: [
    {
      href: "/${cleanKey}",
      label: "${label}",
      labelKey: "${cleanKey}",
      icon: Package,
      group: "main",
      order: 10,
      permission: { definition: ${cleanKey}Permissions, action: "view" },
    },
  ],
};
`;
  fs.writeFileSync(path.join(moduleDir, "module.config.ts"), configCode, "utf8");

  // 3. schema.prisma
  const schemaCode = `model ${pascalName}Item {
  id          String   @id @default(uuid())
  title       String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("${cleanKey}_items")
}
`;
  fs.writeFileSync(path.join(moduleDir, "schema.prisma"), schemaCode, "utf8");
  try {
    fs.symlinkSync("../schema.prisma", path.join(moduleDir, "prisma", "schema.prisma"));
  } catch {
    fs.writeFileSync(path.join(moduleDir, "prisma", "schema.prisma"), schemaCode, "utf8");
  }

  // 4. messages/tr.json and messages/de.json
  const trMessages = {
    title: label,
    description: description,
    listTitle: `${label} Listesi`,
    newItem: `Yeni ${label}`,
    emptyTitle: `Henüz kayıt bulunmuyor`,
    emptyDescription: `İlk kaydınızı eklemek için 'Yeni ${label}' butonuna tıklayın.`,
  };

  const deMessages = {
    title: label,
    description: description,
    listTitle: `${label}-Übersicht`,
    newItem: `Neuer Eintrag`,
    emptyTitle: `Keine Einträge vorhanden`,
    emptyDescription: `Klicken Sie auf 'Neuer Eintrag', um den ersten Datensatz anzulegen.`,
  };

  fs.writeFileSync(
    path.join(moduleDir, "messages", "tr.json"),
    JSON.stringify(trMessages, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(moduleDir, "messages", "de.json"),
    JSON.stringify(deMessages, null, 2) + "\n",
    "utf8",
  );

  // 5. views/<cleanKey>-list-view.tsx
  const viewCode = `import { Package, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { Button } from "@heroui/react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ${cleanKey}Permissions } from "../permissions";

export async function ${pascalName}ListView() {
  try {
    await requirePermission(${cleanKey}Permissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("${cleanKey}");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button color="primary" startContent={<Plus className="h-4 w-4" />}>
            {t("newItem")}
          </Button>
        }
      />
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    </div>
  );
}
`;
  fs.writeFileSync(path.join(moduleDir, "views", `${cleanKey}-list-view.tsx`), viewCode, "utf8");

  // 6. ui.ts
  const uiCode = `// ${cleanKey} modülü — UI public girişi (3.4)
export { ${pascalName}ListView } from "./views/${cleanKey}-list-view";
`;
  fs.writeFileSync(path.join(moduleDir, "ui.ts"), uiCode, "utf8");

  // 7. server.ts
  const serverCode = `// ${cleanKey} modülü — Server public girişi (3.4)
import "server-only";
export { ${cleanKey}Permissions } from "./permissions";
`;
  fs.writeFileSync(path.join(moduleDir, "server.ts"), serverCode, "utf8");

  // 8. index.ts
  const indexCode = `// ${cleanKey} modülü — İzomorfik public girişi (3.4)
export { ${cleanKey}Permissions } from "./permissions";
export { moduleConfig } from "./module.config";
`;
  fs.writeFileSync(path.join(moduleDir, "index.ts"), indexCode, "utf8");

  // 9. src/app/(dashboard)/<cleanKey>/page.tsx
  const pageDir = path.join(APP_DIR, cleanKey);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
    const pageCode = `import { ${pascalName}ListView } from "@/modules/${cleanKey}/ui";

export const metadata = { title: "${label}" };

export default async function ${pascalName}Page() {
  return <${pascalName}ListView />;
}
`;
    fs.writeFileSync(path.join(pageDir, "page.tsx"), pageCode, "utf8");
  }

  // Otomatik senkronizasyonu çalıştır
  const schemaRes = syncModuleSchemas();
  const i18nRes = syncModuleTranslations();
  const regRes = syncModuleRegistry();

  return {
    key: cleanKey,
    label,
    directory: moduleDir,
    syncedSchemas: schemaRes.synced,
    mergedLocales: Object.keys(i18nRes.modulesMerged),
    totalRegisteredModules: regRes.registered.length,
  };
}

// CLI doğrudan çalıştırma
const isCLI =
  process.argv[1] &&
  (process.argv[1] === import.meta.filename ||
    path.basename(process.argv[1]).includes("scaffold-module"));

if (isCLI) {
  const modName = process.argv[2];
  if (!modName) {
    console.error("Kullanım: pnpm module:create <modul-adi> [Modul Basligi]");
    process.exit(1);
  }
  const modLabel = process.argv[3];
  try {
    const res = scaffoldModule(modName, { label: modLabel });
    console.log(`[scaffold] ✅ "${res.key}" modülü başarıyla oluşturuldu ve sisteme bağlandı!`);
    console.log(`- Konum: ${res.directory}`);
    console.log(`- Toplam kayıtlı modül: ${res.totalRegisteredModules}`);
    console.log(`- Şemaları uygulamak için: pnpm db:migrate`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scaffold] ❌ Hata: ${message}`);
    process.exit(1);
  }
}
