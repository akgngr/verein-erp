import de from "../messages/de.json";
import tr from "../messages/tr.json";
import type { BriefingDigest, BriefingRecipient } from "./daily-briefing";

/**
 * Günlük özet e-postası (#294). Gövde yalnız toplam sayılar ve uygulama içi bağlantı içerir:
 * isim, tutar, başlık veya öğe ayrıntısı gönderilmez. Alıcı adresi yalnız teslimde kullanılır.
 * Görsel/HTML şablon T3.2'de (#262) `renderBriefingEmail` yerine bağlanabilir; sözleşme aynı kalır.
 */
export type BriefingEmail = { subject: string; text: string; html?: string };
export type BriefingEmailRenderer = (digest: BriefingDigest, options: { locale: "tr" | "de"; url: string }) => BriefingEmail;

const MESSAGES = { tr: tr.digest, de: de.digest } as const;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export const renderBriefingEmail: BriefingEmailRenderer = (digest, { locale, url }) => {
  const m = MESSAGES[locale];
  const values = { total: digest.total, danger: digest.danger, warning: digest.warning, date: digest.date, url };
  return {
    subject: fill(m.subject, values),
    text: [fill(m.intro, values), digest.danger > 0 ? fill(m.urgent, values) : null, "", fill(m.link, values), "", m.footer]
      .filter((line): line is string => line !== null)
      .join("\n"),
  };
};

/** `APP_URL` + "/sekreter"; geçersiz veya http(s) olmayan adreste null (e-posta gönderilmez). */
export function secretaryLink(appUrl: string | undefined): string | null {
  if (!appUrl) return null;
  try {
    const base = new URL(appUrl);
    if (base.protocol !== "https:" && base.protocol !== "http:") return null;
    return new URL("/sekreter", base).toString();
  } catch {
    return null;
  }
}

export type EmailDeliveryDeps = {
  appUrl: string | undefined;
  locale: "tr" | "de";
  isMailConfigured: () => Promise<boolean>;
  send: (message: { to: string; subject: string; text: string; html?: string; context: { module: string; reference?: string } }) => Promise<{ ok: boolean }>;
  render?: BriefingEmailRenderer;
};

export class BriefingEmailError extends Error {}

/**
 * Kanal teslimcisi: yalnız "email" kanalı. Adres yoksa, uygulama adresi tanımlı değilse veya mail
 * yapılandırılmamışsa sessizce atlar (hata içeriği/alıcı log'a yazılmaz).
 */
export function createEmailDelivery(deps: EmailDeliveryDeps) {
  return async (user: BriefingRecipient, channel: string, digest: BriefingDigest): Promise<void> => {
    if (channel !== "email" || !user.email) return;
    const url = secretaryLink(deps.appUrl);
    if (!url || !(await deps.isMailConfigured())) return;
    const email = (deps.render ?? renderBriefingEmail)(digest, { locale: deps.locale, url });
    const result = await deps.send({ to: user.email, subject: email.subject, text: email.text, ...(email.html ? { html: email.html } : {}), context: { module: "secretary", reference: `daily-briefing:${digest.date}` } });
    if (!result.ok) throw new BriefingEmailError("SECRETARY_BRIEFING_EMAIL_FAILED");
  };
}
