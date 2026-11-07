import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getDb } from "@/shared/db";

/**
 * Teslim / açılma / tıklama izleme. E-postada: 1×1 piksel (açılma) ve imzalı yönlendirme bağlantıları
 * (tıklama). İmza, bağlantının yalnız gönderdiğimiz hedefe yönlendirmesini garanti eder (açık yönlendirme
 * yok). SMS/WhatsApp: sağlayıcı bildirimleri `recordProviderStatus` ile işlenir.
 */

export const newTrackingToken = () => randomBytes(18).toString("base64url");

function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("MAILING_NO_SECRET");
  return `verein-erp:mailing-tracking:${value}`;
}

export function signLink(token: string, url: string): string {
  return createHmac("sha256", secret()).update(`${token}\n${url}`).digest("base64url").slice(0, 22);
}

export function verifyLink(token: string, url: string, signature: string): boolean {
  const expected = Buffer.from(signLink(token, url));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Yönlendirilebilir hedef: yalnız http(s). */
export const isRedirectable = (url: string) => /^https?:\/\/[^\s]+$/i.test(url);

/** HTML'deki http(s) bağlantılarını izlemeli bağlantıya çevirir ve açılma pikselini ekler. */
export function injectTracking(html: string, baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, raw: string) => {
    const url = raw.replace(/&amp;/g, "&");
    return `href="${base}/api/mailings/t/c/${token}?u=${encodeURIComponent(url)}&amp;s=${signLink(token, url)}"`;
  });
  const pixel = `<img src="${base}/api/mailings/t/o/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`;
  return rewritten.includes("</body>") ? rewritten.replace("</body>", `${pixel}</body>`) : rewritten + pixel;
}

/** Açılma (piksel). İlk açılış zamanı ve sayaç; FAILED kayıtlar değişmez. */
export async function recordOpen(token: string): Promise<void> {
  const db = getDb();
  const row = await db.mailingDelivery.findUnique({ where: { token }, select: { id: true, status: true, readAt: true } });
  if (!row || row.status === "FAILED") return;
  await db.mailingDelivery.update({
    where: { id: row.id },
    data: { openCount: { increment: 1 }, ...(row.readAt ? {} : { readAt: new Date(), status: "READ" }) },
  });
}

/** Tıklama; açılma pikseli engellenmiş olsa da tıklayan açmış sayılır. */
export async function recordClick(token: string): Promise<boolean> {
  const db = getDb();
  const row = await db.mailingDelivery.findUnique({ where: { token }, select: { id: true, readAt: true, firstClickAt: true } });
  if (!row) return false;
  const now = new Date();
  await db.mailingDelivery.update({
    where: { id: row.id },
    data: {
      clickCount: { increment: 1 },
      ...(row.firstClickAt ? {} : { firstClickAt: now }),
      ...(row.readAt ? {} : { readAt: now, status: "READ" }),
    },
  });
  return true;
}

const RANK: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };

/** Sağlayıcı bildirimi (SMS/WhatsApp). Durum geri gitmez (okundu → teslim edildi olmaz). */
export async function recordProviderStatus(input: { channel: string; providerId: string; status: "DELIVERED" | "READ" | "FAILED"; at?: Date; error?: string }): Promise<boolean> {
  const db = getDb();
  const row = await db.mailingDelivery.findFirst({ where: { channel: input.channel, providerId: input.providerId }, select: { id: true, status: true, deliveredAt: true, readAt: true } });
  if (!row) return false;
  const at = input.at ?? new Date();
  if (input.status === "FAILED") {
    if (row.status === "QUEUED" || row.status === "SENT") await db.mailingDelivery.update({ where: { id: row.id }, data: { status: "FAILED", error: input.error?.slice(0, 80) ?? "PROVIDER_FAILED" } });
    return true;
  }
  await db.mailingDelivery.update({
    where: { id: row.id },
    data: {
      ...(RANK[input.status] > (RANK[row.status] ?? 0) && row.status !== "FAILED" ? { status: input.status } : {}),
      ...(row.deliveredAt ? {} : { deliveredAt: at }),
      ...(input.status === "READ" && !row.readAt ? { readAt: at } : {}),
    },
  });
  return true;
}

/** Kampanya başına huni sayıları. */
export async function deliveryStats(campaignIds: string[]): Promise<Map<string, { delivered: number; read: number; clicked: number }>> {
  if (!campaignIds.length) return new Map();
  const rows = await getDb().mailingDelivery.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaignIds } },
    _count: { deliveredAt: true, readAt: true, firstClickAt: true },
  });
  return new Map(rows.map((row) => [row.campaignId, { delivered: row._count.deliveredAt, read: row._count.readAt, clicked: row._count.firstClickAt }]));
}
