import { getTranslations } from "next-intl/server";
import { requireUser } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { PageHeader } from "@/shared/components/ui/page-header";
import { socialLoginPermissions } from "./permissions";
import { listProviderSettings } from "./queries/settings";
import { ProviderForm } from "./components/provider-form";

export async function generateMetadata() {
  const t = await getTranslations("social-login.meta");
  return { title: t("title") };
}
export default async function SocialLoginPage() {
  const user = await requireUser();
  const t = await getTranslations("social-login");
  if (!can(user.role, socialLoginPermissions, "view")) return null;
  const settings = can(user.role, socialLoginPermissions, "update") ? await listProviderSettings() : [];
  return <div className="flex flex-col gap-6"><PageHeader title={t("title")} description={t("description")} />
    <div className="grid gap-4 lg:grid-cols-2">{settings.map((row) => <ProviderForm key={row.id} settings={row} />)}</div>
  </div>;
}
