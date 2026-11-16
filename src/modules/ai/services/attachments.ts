import "server-only";

import { openSecret, sealSecret } from "@/shared/security/secret-box";

/**
 * Sohbet ekleri (dosyadan çıkarılan metin). Dosya KAYDEDİLMEZ: metin sunucuda çıkarılır ve kullanıcıya
 * bağlı, süreli, şifreli bir mühür olarak istemciye döner; istemci metni göremez. Mühür yalnız aynı
 * kullanıcı tarafından, süresi içinde, bir sohbet turunda açılır.
 */
export const AI_ATTACHMENT_PURPOSE = "ai-chat-attachment";
export const AI_ATTACHMENT_TTL_MS = 60 * 60 * 1000;
export const AI_ATTACHMENT_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "docx", "xlsx", "md", "markdown", "csv", "txt"] as const;
export const AI_ATTACHMENTS_PER_MESSAGE = 5;
/** Bir turda modele giden ek metninin toplam üst sınırı (karakter). */
export const AI_ATTACHMENT_TOTAL_CHARS = 40_000;

export type AiAttachment = { name: string; source: "text" | "ocr"; truncated: boolean; text: string };
type Sealed = AiAttachment & { u: string; exp: number };

export function sealAttachment(userId: string, attachment: AiAttachment, now = Date.now()): string {
  const payload: Sealed = { ...attachment, u: userId, exp: now + AI_ATTACHMENT_TTL_MS };
  return sealSecret(AI_ATTACHMENT_PURPOSE, JSON.stringify(payload));
}

/** Mührü açar; başka kullanıcının, süresi geçmiş ya da bozuk mühür null döner. */
export function openAttachment(userId: string, token: string, now = Date.now()): AiAttachment | null {
  const raw = openSecret(AI_ATTACHMENT_PURPOSE, token);
  if (!raw) return null;
  try {
    const sealed = JSON.parse(raw) as Sealed;
    if (sealed.u !== userId || typeof sealed.exp !== "number" || sealed.exp < now || typeof sealed.text !== "string") return null;
    return { name: sealed.name, source: sealed.source, truncated: sealed.truncated, text: sealed.text };
  } catch {
    return null;
  }
}

/** Modele verilecek ek bloğu; toplam karakter sınırını aşan kısım kesilir ve belirtilir. */
export function attachmentBlock(attachments: AiAttachment[]): string {
  let budget = AI_ATTACHMENT_TOTAL_CHARS;
  const parts: string[] = [];
  for (const attachment of attachments) {
    const text = attachment.text.slice(0, Math.max(0, budget));
    budget -= text.length;
    const cut = attachment.truncated || text.length < attachment.text.length;
    // i18n-ignore (model-facing)
    parts.push(`<attachment name="${attachment.name.replace(/["<>]/g, "")}" extracted_by="${attachment.source}"${cut ? ' truncated="true"' : ""}>\n${text}\n</attachment>`);
  }
  return parts.join("\n\n");
}
