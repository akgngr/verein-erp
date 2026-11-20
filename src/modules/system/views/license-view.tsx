import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { StatusChip } from "@/shared/components/ui/status-chip";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";

import { LicensePanel } from "../components/license-panel";
import { getLicenseInstance, getLicenseStatus } from "../services/license-store";

const TONE = { valid: "success", grace: "warning", expired: "danger", mismatch: "danger", invalid: "danger", none: "default" } as const;

/** Ayarlar → Lisans (yalnız yönetici). Lisans metni gösterilmez; yalnız özet. */
export async function LicenseView() {
  let user;
  try {
    user = await requirePermission(systemPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, format, status, instance] = await Promise.all([getTranslations("system.license"), getFormatter(), getLicenseStatus(new Date()), getLicenseInstance()]);
  const payload = "payload" in status ? status.payload : null;
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <section className="space-y-3 rounded-xl border border-ink-200 bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{t("statusTitle")}</h2>
          <StatusChip tone={TONE[status.state]}>{t(`state.${status.state}` as never)}</StatusChip>
        </div>
        {status.state === "mismatch" ? <p className="text-sm text-danger-600">{t(`mismatch.${status.reason}` as never)}</p> : null}
        {status.state === "invalid" ? <p className="text-sm text-danger-600">{t(`errors.${status.reason}` as never)}</p> : null}
        {status.state === "grace" ? <p className="text-sm text-warning-700">{t("graceNotice", { date: date(status.graceEndsAt) })}</p> : null}
        {payload ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-ink-500">{t("fields.licenseId")}</dt><dd className="font-mono">{payload.licenseId}</dd>
            <dt className="text-ink-500">{t("fields.tier")}</dt><dd>{payload.tier}</dd>
            <dt className="text-ink-500">{t("fields.organisation")}</dt><dd>{payload.organisation.name}</dd>
            <dt className="text-ink-500">{t("fields.domain")}</dt><dd className="font-mono">{payload.domain}</dd>
            <dt className="text-ink-500">{t("fields.features")}</dt><dd className="font-mono">{payload.features.join(", ") || "—"}</dd>
            <dt className="text-ink-500">{t("fields.expiresAt")}</dt><dd>{date(payload.expiresAt)}</dd>
          </dl>
        ) : null}
        <p className="text-xs text-ink-500">{t("instance", { domain: instance.domain ?? "—", organisation: instance.organisation.name ?? "—" })}</p>
      </section>
      <LicensePanel hasLicense={status.state !== "none"} canEdit={can(user.role, systemPermissions, "update")} canRemove={can(user.role, systemPermissions, "delete")} />
    </div>
  );
}
