import { getTranslations } from "next-intl/server";

import { moduleDemoRegistry } from "@/demo-registry";
import { requirePermission } from "@/modules/auth/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { PageHeader } from "@/shared/components/ui/page-header";

import { DemoControls } from "../components/demo-controls";
import { demoPermissions } from "../permissions";
import { getDemoSummary } from "../services/demo-data";

/** Ayarlar → Demo veri: kapsanan modüller, mevcut demo kayıt sayıları, yükle/sil. */
export async function DemoView() {
  await requirePermission(demoPermissions, "view");
  const t = await getTranslations("demo");
  const tRoot = await getTranslations();
  const [summary, usable] = await Promise.all([getDemoSummary(), listUsableModuleKeys()]);
  const counts = new Map(summary.map((row) => [row.moduleKey, row.count]));
  const providers = [...moduleDemoRegistry].sort((a, b) => a.order - b.order);
  const total = summary.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <section className="space-y-4 rounded-large border border-default-200 bg-content1 p-4">
          <p className="text-sm text-default-600">{total > 0 ? t("statusLoaded", { count: total }) : t("statusEmpty")}</p>
          <DemoControls hasData={total > 0} />
          <p className="text-xs text-default-500">{t("privacyNote")}</p>
      </section>
      <section className="rounded-large border border-default-200 bg-content1 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-default-500">
                <th className="py-2">{t("columns.module")}</th>
                <th className="py-2">{t("columns.state")}</th>
                <th className="py-2 text-right">{t("columns.records")}</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.moduleKey} className="border-t border-default-100">
                  <td className="py-2">{tRoot(`${provider.moduleKey}.module.label` as never)}</td>
                  <td className="py-2 text-default-500">{usable.includes(provider.moduleKey) ? t("moduleActive") : t("moduleInactive")}</td>
                  <td className="py-2 text-right tabular-nums">{counts.get(provider.moduleKey) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </section>
    </div>
  );
}
