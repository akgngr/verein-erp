import "server-only";

import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";

import {
  getModuleAvailability,
  type ModuleAvailability,
} from "./module-availability";

/**
 * #580: Modül yönetimi metinleri (pasif, izin bekliyor, lisans) yalnız modülleri görebilen oturumlu kullanıcıya
 * gösterilir. Herkese açık sayfalarda (/portal, /oy, /formular) anonim ziyaretçi yönetim ayrıntısı yerine
 * yalnız "sayfa kullanılamıyor" görür; API köprüleri 404 döner.
 */
async function canSeeGovernance(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return Boolean(user && can(user.role, systemPermissions, "view"));
  } catch {
    return false;
  }
}

export {
  getModuleAvailability,
  listUsableModuleKeys,
  type ModuleAvailability,
} from "./module-availability";

async function ModuleUnavailable({
  status,
}: {
  status: Exclude<ModuleAvailability, "available">;
}) {
  const t = await getTranslations("system.gate");
  if (!(await canSeeGovernance())) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold">{t("public.title")}</h1>
        <p className="text-sm text-ink-500">{t("public.description")}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-surface p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/15">
        <Lock className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold">{t(`${status}.title`)}</h1>
      <p className="text-sm text-ink-500">{t(`${status}.description`)}</p>
      <Link
        href="/ayarlar/moduller"
        className="text-sm font-medium text-accent hover:underline"
      >
        {t("manage")}
      </Link>
    </div>
  );
}

/** Üretilen sayfa köprüleri modül sayfasını bununla sarar (src/shared/modules/sync-routes.ts). */
export function withModuleGate<P extends object>(
  key: string,
  Page: (props: P) => unknown,
) {
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
export function gateRouteHandler<H extends RouteHandler>(
  key: string,
  handler: H,
): H {
  return (async (...args: Parameters<H>) => {
    const status = await getModuleAvailability(key);
    if (status !== "available") {
      if (!(await canSeeGovernance())) return Response.json({ ok: false, error: "notFound" }, { status: 404 });
      const t = await getTranslations("system.gate");
      return Response.json(
        { ok: false, error: t(`${status}.title`) },
        { status: 403 },
      );
    }
    return handler(...args);
  }) as H;
}
