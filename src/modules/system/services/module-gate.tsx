import "server-only";

import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { allModules } from "@/registry";
import { isAccessApproved } from "@/shared/modules/module-access";

import { getAccessRecords } from "./module-access-store";
import { listActiveModuleKeys } from "./module-state-store";

export type ModuleAvailability = "available" | "inactive" | "needsApproval";

/**
 * Modül kullanılabilir mi: çekirdek modüller her zaman; diğerleri etkin olmalı ve başka
 * modüllerden istedikleri erişim yönetici tarafından onaylanmış olmalı.
 */
export async function getModuleAvailability(key: string): Promise<ModuleAvailability> {
  const mod = allModules.find((candidate) => candidate.key === key);
  if (!mod || mod.category === "CORE") return "available";
  if (!(await listActiveModuleKeys([key])).includes(key)) return "inactive";
  if (!mod.access?.length) return "available";
  return isAccessApproved(mod, (await getAccessRecords())[key]) ? "available" : "needsApproval";
}

/** Menü, panel kartları ve ayar merkezi için kullanılabilir modüller. */
export async function listUsableModuleKeys(): Promise<string[]> {
  const [records, activeKeys] = await Promise.all([getAccessRecords(), listActiveModuleKeys(allModules.map((mod) => mod.key))]);
  const active = new Set(activeKeys);
  return allModules
    .filter((mod) => mod.category === "CORE" || (active.has(mod.key) && isAccessApproved(mod, records[mod.key])))
    .map((mod) => mod.key);
}

async function ModuleUnavailable({ status }: { status: Exclude<ModuleAvailability, "available"> }) {
  const t = await getTranslations("system.gate");
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-default-200 bg-content1 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/15">
        <Lock className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="text-large font-semibold">{t(`${status}.title`)}</h1>
      <p className="text-small text-default-500">{t(`${status}.description`)}</p>
      <Link href="/ayarlar/moduller" className="text-small font-medium text-primary hover:underline">
        {t("manage")}
      </Link>
    </div>
  );
}

/** Üretilen sayfa köprüleri modül sayfasını bununla sarar (src/shared/modules/sync-routes.ts). */
export function withModuleGate<P extends object>(key: string, Page: (props: P) => unknown) {
  return async function GatedPage(props: P): Promise<ReactNode> {
    const status = await getModuleAvailability(key);
    if (status !== "available") return <ModuleUnavailable status={status} />;
    // Sunucu sayfası fonksiyon olarak çağrılır: yönlendiren sayfalar (redirect) değer döndürmez.
    return (await Page(props)) as ReactNode;
  };
}

/** Next rota imzası rotaya göre değişir (params tipi); sarmalayıcı imzayı olduğu gibi korur. */
type RouteHandler = (...args: never[]) => Response | Promise<Response>;

/** Üretilen API köprüleri her HTTP yöntemini bununla sarar. */
export function gateRouteHandler<H extends RouteHandler>(key: string, handler: H): H {
  return (async (...args: Parameters<H>) => {
    const status = await getModuleAvailability(key);
    if (status !== "available") {
      const t = await getTranslations("system.gate");
      return Response.json({ ok: false, error: t(`${status}.title`) }, { status: 403 });
    }
    return handler(...args);
  }) as H;
}
