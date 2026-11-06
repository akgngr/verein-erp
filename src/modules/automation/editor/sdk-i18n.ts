import i18next from "i18next";

/**
 * The Workflow Builder SDK ships English/Polish only and uses the default
 * i18next instance. Register our translations (from automation.workflows.sdk)
 * for the active locale; missing keys fall back to English.
 */
export function applyEditorLocale(locale: string, bundle: Record<string, unknown>): void {
  const language = locale === "de" ? "de" : "tr";
  i18next.addResourceBundle(language, "translation", bundle, true, true);
  if (i18next.isInitialized && i18next.language !== language) void i18next.changeLanguage(language);
}
