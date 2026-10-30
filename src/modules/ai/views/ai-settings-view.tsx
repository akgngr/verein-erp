import { CheckCircle2, CircleSlash } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { getModuleAvailability } from "@/modules/system/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { ConsentToggle } from "../components/consent-toggle";
import { aiPermissions } from "../permissions";
import { hasAiConsent, isAiConfigured } from "../services/consent";
import { availableTools } from "../services/tools";

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
  const [availability, consented, tools] = await Promise.all([getModuleAvailability("ai"), hasAiConsent(user.id), availableTools(user)]);
  const configured = isAiConfigured();
  const areas = [...new Set(tools.map((tool) => tool.module))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Status ok={availability === "available"} label={t("status.module")} detail={t(`status.availability.${availability}`)} />
        <Status ok={configured} label={t("status.key")} detail={configured ? t("status.keyOk") : t("status.keyMissing")} />
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
        <h2 className="text-medium font-semibold">{t("areasTitle")}</h2>
        <p className="text-small text-default-500">{t("areasHelp")}</p>
        <div className="flex flex-wrap gap-2">
          {areas.length === 0 ? <span className="text-small text-default-400">{t("areasNone")}</span> : null}
          {areas.map((area) => (
            <span key={area} className="rounded-full border border-default-200 px-3 py-1 text-small">
              {t(`areas.${area}`)}
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
