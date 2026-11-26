import { getTranslations } from "next-intl/server";
import { LoginView } from "./login-view";
import { signIn } from "../auth";
import { loadEnabledAuthProviders } from "../services/oauth-providers";

export async function LoginPageView({ passive, oauthDenied }: { passive?: boolean; oauthDenied?: boolean }) {
  const { providers } = passive ? { providers: [] } : await loadEnabledAuthProviders();
  const options = providers.flatMap((provider) => {
    const config = typeof provider === "function" ? provider() : provider;
    return config.id && config.name ? [{ id: config.id, name: config.name }] : [];
  });
  const t = await getTranslations("auth");
  async function externalLogin(form: FormData) {
    "use server";
    const id = form.get("provider");
    if (typeof id !== "string" || !(await loadEnabledAuthProviders()).ids.includes(id)) return;
    await signIn(id, { redirectTo: "/" });
  }
  return <div className="w-full max-w-md">
    <LoginView passive={passive} oauthDenied={oauthDenied} />
    {options.length > 0 && <form action={externalLogin} className="mt-4 flex flex-col gap-2">
      {options.map(({ id, name }) => <button key={id} type="submit" name="provider" value={id} className="rounded-lg border border-ink-200 bg-surface px-4 py-3 text-sm text-foreground hover:bg-ink-50">{t("externalLogin", { provider: name })}</button>)}
    </form>}
  </div>;
}
