import { getTranslations } from "next-intl/server";
import { listExternalLoginProviders, signIn } from "../auth";
import { LoginView } from "./login-view";

export async function LoginPageView({ passive }: { passive?: boolean }) {
  const providers = passive ? [] : await listExternalLoginProviders();
  const t = await getTranslations("auth");
  async function login(form: FormData) {
    "use server";
    const id = form.get("provider");
    if (typeof id !== "string" || !(await listExternalLoginProviders()).some((p) => p.id === id)) return;
    await signIn(id, { redirectTo: "/" });
  }
  return (
    <div className="w-full max-w-md">
      <LoginView passive={passive} />
      {providers.length > 0 && (
        <form action={login} className="mt-4 flex flex-col gap-2">
          {providers.map((provider) => (
            <button key={provider.id} name="provider" value={provider.id} className="rounded-lg border border-ink-200 bg-surface px-4 py-3 text-sm text-foreground">
              {t("externalLogin", { provider: provider.name })}
            </button>
          ))}
        </form>
      )}
    </div>
  );
}
