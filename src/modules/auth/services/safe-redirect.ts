/**
 * #612: Giriş sonrası yönlendirme yalnız aynı kökene yapılır (açık yönlendirme yok).
 *
 * KARAR: Önek denetimi yapılmaz; hedef HER ZAMAN taban adrese göre çözülür ve çözülen kökenin taban kökenle
 * aynı olduğu doğrulanır. URL ayrıştırıcısı sekme/satır sonu karakterlerini sildiği için "/\t/evil" gibi
 * girdiler şema-göreli yola ("//evil") dönüşür; önek denetimi bunları kaçırırdı (Codex P2, #620).
 */
export function safeRedirect(url: string, baseUrl: string): string {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return "/";
  }
  try {
    const target = new URL(url, base);
    if (target.origin !== base.origin) return base.toString();
    if (target.protocol !== "http:" && target.protocol !== "https:") return base.toString();
    return target.toString();
  } catch {
    return base.toString();
  }
}
