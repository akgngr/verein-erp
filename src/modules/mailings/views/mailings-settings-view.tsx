import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { resolvePublicOrigin } from "@/shared/security/public-origin";

import { ChannelSettings } from "../components/channel-settings";
import { mailingsPermissions } from "../permissions";
import { listChannelSettings } from "../services/campaigns";

async function requestOrigin(): Promise<string> {
  return resolvePublicOrigin(await headers()) ?? "";
}

/** Kampanyalar → Ayarlar: SMS, Telegram, WhatsApp eklentilerinin sağlayıcı ayarları. */
export async function MailingsSettingsView() {
  try {
    await requirePermission(mailingsPermissions, "approve");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("mailings.settings");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <ChannelSettings channels={await listChannelSettings(await requestOrigin())} />
    </div>
  );
}
