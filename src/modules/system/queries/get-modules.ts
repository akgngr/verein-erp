import { allModules } from "@/registry";
import { getModuleStates } from "@/shared/modules/module-store";
import type { ModuleCategory } from "@/shared/types/module";

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
  const states = getModuleStates();

  const modules: ModuleItem[] = allModules.map((mod) => {
    const isProtected = Boolean(mod.isProtected || mod.category === "CORE");
    const isActive = isProtected ? true : (states[mod.key] ?? true);

    return {
      key: mod.key,
      label: mod.label,
      description: mod.description,
      version: mod.version ?? "1.0.0",
      author: mod.author ?? (mod.category === "EXTENSION" ? "Topluluk / Geliştirici" : "Verein ERP"),
      category: mod.category,
      isProtected,
      isActive,
      navCount: mod.nav.length,
      routes: mod.nav.map((n) => n.href),
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
