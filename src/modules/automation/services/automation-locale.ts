/**
 * Arka plan görevlerinin dili (#582). Görev; elle başlatmada kullanıcının arayüz dilini, iş akışı alt
 * görevlerinde akışın başlatıldığı dili, zamanlanmış/olay tetiklemeli çalışmada belge dilini
 * (`DOCUMENT_LANGUAGE`, varsayılan "de") kullanır. Önceden alt görevler ve zamanlamalar sabit "de" idi.
 *
 * `getEnv()` yerine doğrudan `process.env` okunur: çevrimdışı birim testleri ve çalışan (worker) başlangıcı
 * tüm ortam doğrulamasına bağlı kalmaz; geçersiz değer "de" olur (env şemasıyla aynı varsayılan).
 */
export type AutomationLocale = "tr" | "de";

export function normalizeAutomationLocale(value: unknown): AutomationLocale | null {
  return value === "tr" || value === "de" ? value : null;
}

export function defaultAutomationLocale(): AutomationLocale {
  return normalizeAutomationLocale(process.env.DOCUMENT_LANGUAGE) ?? "de";
}

/** Kayıtlı bağlamdaki dil; yoksa belge dili. */
export function automationLocaleFrom(context: unknown): AutomationLocale {
  const value = context && typeof context === "object" && !Array.isArray(context) ? (context as Record<string, unknown>).locale : null;
  return normalizeAutomationLocale(value) ?? defaultAutomationLocale();
}
