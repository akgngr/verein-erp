import { CheckCircle2, CircleSlash, Puzzle } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { getModuleAvailability } from "@/modules/system/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { ConsentToggle } from "../components/consent-toggle";
import { can } from "@/shared/permissions/define";

import { aiPermissions } from "../permissions";
import { ProviderSelect } from "../components/provider-select";
import { getActiveProvider, hasAiConsent } from "../services/consent";
import { allModules } from "@/registry";

import { PermissionMatrix } from "../components/permission-matrix";
import { getAiPermissions } from "../services/permissions";
import { listProviderStatus } from "../services/providers";
import { availableTools, supportedOperations } from "../services/tools";

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-medium border border-default-200 bg-content1 p-4">
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden /> : <CircleSlash className="mt-0.5 h-5 w-5 shrink-0 text-default-400" aria-hidden />}
      <div className="flex flex-col gap-0.5">
        <span className="text-small font-semibold">{label}</span>
        <span className="text-small text-default-500">{detail}</span>
      </div>
    </div>
  );
}

/** Asistanın durumu, erişebildiği alanlar, veri koruma taahhütleri ve kullanıcının rızası. */
export async function AiSettingsView() {
  let user;
  try {
    user = await requirePermission(aiPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("ai.settings");
  // Anahtar değerleri istemciye gönderilmez; yalnızca kayıtlı/hazır olup olmadığı ve model adı.
  const [availability, consented, tools, active, providers, matrix, tRoot] = await Promise.all([
    getModuleAvailability("ai"),
    hasAiConsent(user.id),
    availableTools(user),
    getActiveProvider(),
    listProviderStatus(),
    getAiPermissions(),
    getTranslations(),
  ]);
  const configured = active !== null;
  const canManage = can(user.role, aiPermissions, "update");
  const moduleLabel = (key: string) => (tRoot.has(`${key}.module.label`) ? tRoot(`${key}.module.label`) : (allModules.find((mod) => mod.key === key)?.label ?? key));
  // Matris: asistanın kendisi hariç tüm modüller; asistanın aracı olanlar önce.
  const supported = supportedOperations();
  const moduleDescription = (key: string) => (tRoot.has(`${key}.module.description`) ? tRoot(`${key}.module.description`) : (allModules.find((mod) => mod.key === key)?.description ?? ""));
  const matrixModules = allModules
    .filter((mod) => mod.key !== "ai")
    .map((mod) => {
      // İkon sunucuda çizilir (bileşen fonksiyonları istemciye gönderilemez).
      const Icon = mod.nav[0]?.icon ?? Puzzle;
      return { key: mod.key, label: moduleLabel(mod.key), description: moduleDescription(mod.key), icon: <Icon aria-hidden /> };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const areas = [...new Set(tools.map((tool) => tool.module))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Status ok={availability === "available"} label={t("status.module")} detail={t(`status.availability.${availability}`)} />
        <Status ok={configured} label={t("status.key")} detail={active ? t("status.keyOk", { provider: active }) : t("status.keyMissing")} />
        <Status ok={consented} label={t("status.consent")} detail={consented ? t("status.consentOk") : t("status.consentMissing")} />
      </div>
      {availability !== "available" ? (
        <p className="text-small text-default-500">
          {t("enableHint")}{" "}
          <Link href="/ayarlar/moduller" className="font-medium text-primary hover:underline">
            {t("modulesLink")}
          </Link>
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-medium font-semibold">{t("providerTitle")}</h2>
        <p className="text-small text-default-500">{t("providerHelp")}</p>
        <ProviderSelect providers={providers} active={active} canChange={canManage} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-medium font-semibold">{t("permissionsTitle")}</h2>
        <p className="text-small text-default-500">{t("permissionsHelp")}</p>
        <PermissionMatrix modules={matrixModules} supported={supported} matrix={matrix} canChange={canManage} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-medium font-semibold">{t("areasTitle")}</h2>
        <p className="text-small text-default-500">{t("areasHelp")}</p>
        <div className="flex flex-wrap gap-2">
          {areas.length === 0 ? <span className="text-small text-default-400">{t("areasNone")}</span> : null}
          {areas.map((area) => (
            <span key={area} className="rounded-full border border-default-200 px-3 py-1 text-small">
              {moduleLabel(area)}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-medium font-semibold">{t("privacyTitle")}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-small text-default-600">
          {(["noPersonal", "masking", "ownRights", "noStorage", "noChanges", "audit", "provider", "revoke"] as const).map((key) => (
            <li key={key}>{t(`privacy.${key}`)}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-medium border border-default-200 bg-content1 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-small font-semibold">{t("myConsent")}</span>
          <span className="text-small text-default-500">{consented ? t("status.consentOk") : t("status.consentMissing")}</span>
        </div>
        <ConsentToggle consented={consented} />
      </section>
    </div>
  );
}
