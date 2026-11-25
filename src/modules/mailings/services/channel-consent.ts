import "server-only";

import { moduleRecipientRegistry } from "@/recipient-registry";
import { writeAudit } from "@/shared/audit/write-audit";

/**
 * #581: Kanal eklentileri (ör. Telegram /start, /stop) rızayı kaynağın kaydına yazar. `recipientKey`
 * gönderimdeki anahtardır: "<modül>:<kaynak>:<kayıt id>". Kaynak `setConsent` sunmuyorsa yazılmaz
 * (`false`); o kaynaktaki alıcıya yine yalnız kaydındaki açık rıza ile gönderilir.
 */
export function parseRecipientKey(recipientKey: string): { moduleKey: string; sourceKey: string; recordId: string } | null {
  const [moduleKey, sourceKey, ...rest] = recipientKey.split(":");
  const recordId = rest.join(":");
  if (!moduleKey || !sourceKey || !recordId) return null;
  return { moduleKey, sourceKey, recordId };
}

/**
 * #581: Tek tıkla abonelikten çıkış (RFC 8058). Belirteç gönderim kaydının rastgele belirtecidir (tahmin
 * edilemez, kişiye özel). Kaynak kaydında e-posta itirazı (`bulkMailOptOut`) işaretlenir; tekrar çağrı zararsızdır.
 */
export async function unsubscribeByToken(token: string): Promise<"done" | "unknown" | "unsupported"> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return "unknown";
  const { getDb } = await import("@/shared/db");
  const delivery = await getDb().mailingDelivery.findUnique({ where: { token }, select: { recipientKey: true } });
  if (!delivery) return "unknown";
  if (!delivery.recipientKey) return "unsupported";
  return (await recordChannelConsent(delivery.recipientKey, "email", false, "E-Mail: One-Click-Abmeldung")) ? "done" : "unsupported";
}

export async function recordChannelConsent(recipientKey: string, channel: string, granted: boolean, actorLabel: string): Promise<boolean> {
  const parsed = parseRecipientKey(recipientKey);
  if (!parsed) return false;
  const source = moduleRecipientRegistry.find((entry) => entry.moduleKey === parsed.moduleKey)?.sources.find((item) => item.key === parsed.sourceKey);
  if (!source?.setConsent) return false;
  const updated = await source.setConsent(parsed.recordId, channel, granted);
  if (updated) {
    // Kişi adı yazılmaz; kayıt anahtarı ve kanal yeterli (DSGVO md. 7/1 rıza ispatı).
    await writeAudit({
      userId: null,
      userLabel: actorLabel,
      action: granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
      entity: "MessagingConsent",
      entityId: recipientKey,
      after: { channel, granted },
    });
  }
  return updated;
}
