import { timingSafeEqual } from "node:crypto";

import { getChannelConfig, recordProviderStatus } from "@/modules/mailings/server";

import { extractStatuses, verifyMetaSignature, type WhatsappWebhook } from "../../services/webhook";

/**
 * GET  /api/campaign-whatsapp/webhook — Meta webhook doğrulaması (hub.verify_token).
 * POST /api/campaign-whatsapp/webhook — mesaj durumları (teslim edildi / okundu / başarısız).
 * Oturum yok; POST gövdesi App Secret ile imzalanır (X-Hub-Signature-256), imzasız istek reddedilir.
 */
export async function GET(request: Request) {
  const config = await getChannelConfig("whatsapp");
  const url = new URL(request.url);
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const expected = config.verifyToken ?? "";
  const ok = url.searchParams.get("hub.mode") === "subscribe" && expected.length >= 8
    && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) return new Response(null, { status: 403 });
  return new Response(url.searchParams.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  const config = await getChannelConfig("whatsapp");
  if (!config.appSecret) return new Response(null, { status: 404 });
  const raw = await request.text();
  if (raw.length > 512 * 1024 || !verifyMetaSignature(config.appSecret, raw, request.headers.get("x-hub-signature-256") ?? "")) {
    return new Response(null, { status: 403 });
  }
  let payload: WhatsappWebhook;
  try {
    payload = JSON.parse(raw) as WhatsappWebhook;
  } catch {
    return new Response(null, { status: 400 });
  }
  for (const item of extractStatuses(payload).slice(0, 500)) {
    await recordProviderStatus({ channel: "whatsapp", ...item });
  }
  return new Response(null, { status: 200 });
}
