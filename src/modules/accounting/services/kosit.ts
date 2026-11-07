import "server-only";

/**
 * İsteğe bağlı tam doğrulama: kendi sunucusunda çalışan resmî KoSIT doğrulayıcısı (itplr-kosit/validator,
 * `-D` daemon modu). XML gövdeyle POST edilir; 200 = kabul edilebilir, 406 = kabul edilemez. Rapordaki
 * bulgular (rep:message) kısaltılarak döner. Adres yalnız yöneticinin girdiği ayardan gelir.
 */
export type KositResult = { ok: true; valid: boolean; messages: { code: string; level: string; text: string }[] } | { ok: false };

export async function validateWithKosit(url: string, xml: string): Promise<KositResult> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false };
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return { ok: false };
  try {
    const response = await fetch(target, { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml, signal: AbortSignal.timeout(20_000), redirect: "error" });
    if (response.status !== 200 && response.status !== 406) return { ok: false };
    const report = (await response.text()).slice(0, 2_000_000);
    const messages = [...report.matchAll(/<rep:message\b([^>]*)>([\s\S]*?)<\/rep:message>/g)].slice(0, 50).map((match) => ({
      code: /\bcode="([^"]+)"/.exec(match[1])?.[1] ?? "",
      level: /\blevel="([^"]+)"/.exec(match[1])?.[1] ?? "",
      // Düz metin: tüm açılı ayraçlar kaldırılır (arayüzde ayrıca React kaçışıyla gösterilir).
      text: match[2].replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
    }));
    return { ok: true, valid: response.status === 200, messages };
  } catch {
    return { ok: false };
  }
}
