import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";

import { OnlineFormTextsForm } from "../components/texts-form";
import { onlineFormsPermissions } from "../permissions";
import { getFormTexts } from "../services/settings";

/** /online-formlar/ayarlar — Datenschutz ve fotoğraf izni metinleri (yalnız yönetici). */
export async function OnlineFormsSettingsView() {
  const t = await getTranslations("online-forms");
  try {
    await requirePermission(onlineFormsPermissions, "approve");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  return (
    <div>
      <PageHeader title={t("settings.title")} description={t("settings.description")} actions={<LinkButton href="/online-formlar" variant="bordered">{t("title")}</LinkButton>} />
      <OnlineFormTextsForm initial={await getFormTexts()} />
    </div>
  );
}
