import { getTranslations } from "next-intl/server";

import { allModules } from "@/registry";
import { isAccessApproved } from "@/shared/modules/module-access";
import type { ModuleAccessOperation, ModuleCategory } from "@/shared/types/module";

import { getAccessRecords } from "../services/module-access-store";
import { getEffectiveModuleStates } from "../services/module-state-store";

export type ModuleItem = {
  key: string;
  label: string;
  description?: string;
  version?: string;
  author?: string;
  category: ModuleCategory;
  isProtected: boolean;
  isActive: boolean;
  navCount: number;
  routes: string[];
  /** Başka modüllerden istenen erişim (ad + işlemler + gerekçe). */
  access: { module: string; moduleLabel: string; operations: ModuleAccessOperation[]; reason: string }[];
  /** none: erişim istemiyor; approved: onaylı; pending: yönetici izni bekliyor. */
  accessStatus: "none" | "approved" | "pending";
  approvedBy: string | null;
};

export async function getModulesList(): Promise<{
  modules: ModuleItem[];
  stats: {
    total: number;
    core: number;
    official: number;
    extension: number;
    active: number;
    inactive: number;
  };
}> {
  const states = await getEffectiveModuleStates();
  const records = await getAccessRecords();
  const t = await getTranslations();
  // Modül adı/açıklaması `<modül>.module.{label,description}` çevirisinden; yoksa config değeri.
  const text = (key: string, fallback: string | undefined) => (t.has(key) ? t(key) : fallback);

  const modules: ModuleItem[] = allModules.map((mod) => {
    const isProtected = Boolean(mod.isProtected || mod.category === "CORE");
    const isActive = isProtected ? true : (states[mod.key] ?? true);

    return {
      key: mod.key,
      label: text(`${mod.key}.module.label`, mod.label) ?? mod.label,
      description: text(`${mod.key}.module.description`, mod.description),
      version: mod.version ?? "1.0.0",
      author: mod.author ?? (mod.category === "EXTENSION" ? t("system.authorCommunity") : "Verein ERP"),
      category: mod.category,
      isProtected,
      isActive,
      navCount: mod.nav.length,
      routes: mod.nav.map((n) => n.href),
      access: (mod.access ?? []).map((request) => ({
        module: request.module,
        moduleLabel: text(`${request.module}.module.label`, allModules.find((other) => other.key === request.module)?.label) ?? request.module,
        operations: request.operations,
        reason: text(`${mod.key}.access.${request.module}`, "") ?? "",
      })),
      accessStatus: !mod.access?.length ? "none" : isAccessApproved(mod, records[mod.key]) ? "approved" : "pending",
      approvedBy: (() => {
        const record = records[mod.key];
        return record && "approvedBy" in record ? record.approvedBy : null;
      })(),
    };
  });

  const stats = {
    total: modules.length,
    core: modules.filter((m) => m.category === "CORE").length,
    official: modules.filter((m) => m.category === "OFFICIAL").length,
    extension: modules.filter((m) => m.category === "EXTENSION").length,
    active: modules.filter((m) => m.isActive).length,
    inactive: modules.filter((m) => !m.isActive).length,
  };

  return { modules, stats };
}
