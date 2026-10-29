import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDateTime } from "@/shared/utils";

import { ReadinessChecklist } from "../components/readiness-checklist";
import { TemplateConfirmForm } from "../components/template-confirm-form";
import { TEMPLATE_VERSION } from "../pdf/template-de";
import { donationsPermissions } from "../permissions";
import { getDonationsSettings } from "../queries/get-settings";
import { getReadiness } from "../services/issue-guards";

/** Şablon önizleme türleri (handlers/template-preview-pdf `?type=`). */
const PREVIEWS = [
  { type: "single-donation", labelKey: "previewSingleDonation" },
  { type: "collective-donation", labelKey: "previewCollectiveDonation" },
  { type: "single-fee", labelKey: "previewSingleFee" },
  { type: "collective-fee", labelKey: "previewCollectiveFee" },
] as const;

/**
 * Bağış ayarları (§ 14 + § 15 md. 8): hazır olma kontrol listesi, şablon
 * önizlemeleri (MUSTER), BMF bağlantısı, metin onayı (approve) ve aidat
 * indirilebilirliğinin salt okunur gösterimi.
 */
export async function DonationsSettingsView() {
  let user;
  try {
    user = await requirePermission(donationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("donations.settings");
  const tIssue = await getTranslations("donations.confirmations.issue");
  const tCommon = await getTranslations("donations.common");
  const [readiness, settings, profile] = await Promise.all([
    getReadiness(new Date()),
    getDonationsSettings(),
    getOrganizationProfile(),
  ]);
  const confirmed = settings.templateConfirmedVersion === TEMPLATE_VERSION;
  const canApprove = can(user.role, donationsPermissions, "approve");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReadinessChecklist
          items={readiness.items}
          title={t("readiness")}
          fixLabel={tIssue("fix")}
          warnLabel={t("validityWarn")}
        />

        <section className="flex flex-col gap-3 rounded-medium border border-default-200 bg-content1 p-4 shadow-sm">
          <h2 className="text-small font-semibold">{t("preview")}</h2>
          <ul className="flex flex-col gap-2">
            {PREVIEWS.map((preview) => (
              <li key={preview.type}>
                <a
                  href={`/api/donations/template-preview/pdf?type=${preview.type}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 text-small text-primary underline"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  {t(preview.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={t("bmflinkHref")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-small text-primary underline"
          >
            {t("bmflink")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </section>

        <section className="flex flex-col gap-3 rounded-medium border border-default-200 bg-content1 p-4 shadow-sm">
          <h2 className="text-small font-semibold">{t("templateSection")}</h2>
          {settings.templateConfirmedAt ? (
            <p className="text-small text-default-600">
              {t("confirmedInfo", {
                label: settings.templateConfirmedByLabel ?? "—",
                date: formatDateTime(settings.templateConfirmedAt),
                version: settings.templateConfirmedVersion ?? "—",
              })}
            </p>
          ) : null}
          {confirmed ? null : (
            <p className="text-small text-warning-700">{t("templateNotConfirmed", { version: TEMPLATE_VERSION })}</p>
          )}
          {canApprove ? <TemplateConfirmForm /> : <p className="text-tiny text-default-500">{t("approveOnly")}</p>}
        </section>

        <section className="flex flex-col gap-2 rounded-medium border border-default-200 bg-content1 p-4 shadow-sm">
          <h2 className="text-small font-semibold">{t("feeSection")}</h2>
          <p className="text-small text-default-600">
            {t("feeDeductibleInfo", { value: profile.membershipFeesDeductible ? tCommon("yes") : tCommon("no") })}
          </p>
          <Link href="/ayarlar/dernek" className="text-small text-primary underline">
            {t("feeDeductibleLink")}
          </Link>
        </section>
      </div>
    </div>
  );
}
