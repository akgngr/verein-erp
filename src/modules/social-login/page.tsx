import { getTranslations } from "next-intl/server";
import { requireUser, listAuthIdentities, loadEnabledAuthProviders } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { PageHeader } from "@/shared/components/ui/page-header";
import { socialLoginPermissions } from "./permissions";
import { listProviderSettings } from "./queries/settings";
import { ProviderForm } from "./components/provider-form";
import { LinkedAccounts } from "./components/linked-accounts";
import { PROVIDERS } from "./constants";

export async function generateMetadata() {
  const t = await getTranslations("social-login.meta");
  return { title: t("title") };
}
export default async function SocialLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const t = await getTranslations("social-login");
  if (!can(user.role, socialLoginPermissions, "view")) return null;
  const settings = can(user.role, socialLoginPermissions, "update") ? await listProviderSettings() : [];
  const params = await searchParams;
  const enabled = await loadEnabledAuthProviders();
  const available = PROVIDERS.filter((id) => enabled.ids.includes(id));
  const identities = await listAuthIdentities(user.id);
  const linked = PROVIDERS.filter((id) => identities.some((identity) => identity.provider === id));
  return <div className="flex flex-col gap-6"><PageHeader title={t("title")} description={t("description")} />
    {params.oauthLink === "success" && <p role="status">{t("linkSuccess")}</p>}
    {params.oauthLink === "denied" && <p role="alert">{t("linkDenied")}</p>}
    <LinkedAccounts linked={linked} available={available} />
    <div className="grid gap-4 lg:grid-cols-2">{settings.map((row) => <ProviderForm key={row.id} settings={row} />)}</div>
  </div>;
}
