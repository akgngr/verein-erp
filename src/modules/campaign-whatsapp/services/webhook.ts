import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/** Meta: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(App Secret, ham gövde). */
export function verifyMetaSignature(appSecret: string, rawBody: string, header: string): boolean {
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type MetaStatus = { id?: string; status?: string; timestamp?: string; errors?: { code?: number }[] };
export type WhatsappWebhook = { entry?: { changes?: { value?: { statuses?: MetaStatus[] } }[] }[] };

/** Bildirimdeki mesaj durumları: delivered → DELIVERED, read → READ, failed → FAILED (sent yok sayılır). */
export function extractStatuses(payload: WhatsappWebhook): { providerId: string; status: "DELIVERED" | "READ" | "FAILED"; at?: Date; error?: string }[] {
  const map = { delivered: "DELIVERED", read: "READ", failed: "FAILED" } as const;
  return (payload.entry ?? []).flatMap((entry) => entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []).flatMap((item) => {
    const status = map[item.status as keyof typeof map];
    if (!status || !item.id) return [];
    const seconds = Number(item.timestamp);
    return [{
      providerId: item.id,
      status,
      at: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : undefined,
      error: item.errors?.[0]?.code ? `WHATSAPP_${item.errors[0].code}` : undefined,
    }];
  });
}
