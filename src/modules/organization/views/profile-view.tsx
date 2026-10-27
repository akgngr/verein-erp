import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { getOrganizationProfile } from "../queries/get-profile";
import { organizationPermissions } from "../permissions";
import { ProfileForm } from "../components/profile-form";

/** Dernek bilgileri sayfası (Faz 4, 4.2) — görüntüleme + güncelleme. */
export async function OrganizationProfileView() {
  let canUpdate = false;
  try {
    const user = await requirePermission(organizationPermissions, "view");
    canUpdate = can(user.role, organizationPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("organization");
  const profile = await getOrganizationProfile();

  return (
    <div>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      {profile.exists ? null : (
        <div className="mb-4 max-w-3xl rounded-medium border border-warning-300 bg-warning-50 px-4 py-3 text-small text-warning-700">
          {t("notConfiguredNote")}
        </div>
      )}
      {canUpdate ? (
        <ProfileForm profile={profile} />
      ) : (
        <div className="max-w-3xl rounded-medium border border-default-200 bg-content1 p-6 shadow-sm">
          {profile.hasLogo && profile.logoVersion ? (
            <div className="mb-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/organization/logo?v=${profile.logoVersion}`}
                alt={t("logoTitle")}
                className="h-16 w-24 rounded-medium border border-default-200 bg-default-50 object-contain"
              />
              <span className="text-tiny text-default-400">{profile.logoOriginalName}</span>
            </div>
          ) : null}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {(
              [
                [t("name"), profile.name],
                [t("street"), profile.street ?? "-"],
                [t("postalCode"), profile.postalCode ?? "-"],
                [t("city"), profile.city ?? "-"],
                [t("country"), profile.country ?? "-"],
                [t("email"), profile.email ?? "-"],
                [t("phone"), profile.phone ?? "-"],
                [t("website"), profile.website ?? "-"],
                [t("registerCourt"), profile.registerCourt ?? "-"],
                [t("registerNumber"), profile.registerNumber ?? "-"],
                [t("taxNumber"), profile.taxNumber ?? "-"],
                [t("taxOffice"), profile.taxOffice ?? "-"],
                [t("exemptionNoticeDate"), profile.exemptionNoticeDate ? profile.exemptionNoticeDate.toISOString().slice(0, 10) : "-"],
                [t("exemptionNoticePeriod"), profile.exemptionNoticePeriod ?? "-"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border-b border-default-100 py-2">
                <dt className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</dt>
                <dd className="text-small text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
