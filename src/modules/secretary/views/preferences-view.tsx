import { getTranslations } from "next-intl/server";
import { getMySecretaryPreferences } from "../services/my-preferences";
import type { Preferences } from "../schemas/preferences";
import { SecretaryPreferencesForm } from "./preferences-form";

export async function SecretaryPreferencesView({ user }: { user: { id: string } }) {
  const t = await getTranslations("secretary");
  let preferences: Preferences | null = null;
  try {
    preferences = await getMySecretaryPreferences(user);
  } catch {
    console.error("[secretary] PREFERENCES_VIEW_FAILED");
  }
  if (!preferences) {
    return <p role="status" className="text-sm text-ink-500">{t("ui.preferencesUnavailable")}</p>;
  }
  return (
    <SecretaryPreferencesForm initial={{
      ...preferences,
      quietFrom: preferences.quietFrom ?? "",
      quietTo: preferences.quietTo ?? "",
    }} labels={{
      title: t("ui.preferencesTitle"),
      enabled: t("ui.preferencesEnabled"),
      briefingTime: t("ui.preferencesTime"),
      quietFrom: t("ui.preferencesQuietFrom"),
      quietTo: t("ui.preferencesQuietTo"),
      inApp: t("ui.preferencesInApp"),
      email: t("ui.preferencesEmail"),
      save: t("ui.preferencesSave"),
      saved: t("ui.preferencesSaved"),
      error: t("ui.preferencesError"),
      invalid: t("ui.preferencesInvalid"),
      emailHint: t("ui.preferencesEmailHint"),
    }} />
  );
}
