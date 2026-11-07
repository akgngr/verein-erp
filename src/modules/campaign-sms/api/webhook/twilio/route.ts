import { getChannelConfig, recordProviderStatus } from "@/modules/mailings/server";

import { mapTwilioStatus, verifyTwilioSignature } from "../../../services/webhook";

/** Genel istek adresi (proxy arkasında X-Forwarded-*): Twilio imzayı bu adresle hesaplar. */
function publicUrl(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}${url.pathname}${url.search}`;
}

/**
 * POST /api/campaign-sms/webhook/twilio — Twilio SMS durum bildirimi (StatusCallback). Oturum yok;
 * X-Twilio-Signature Auth Token ile doğrulanır. SMS'te okundu bilgisi yoktur; yalnız teslim/başarısız.
 */
export async function POST(request: Request) {
  const config = await getChannelConfig("sms");
  if (config.provider !== "twilio" || !config.apiKey) return new Response(null, { status: 404 });
  const params = Object.fromEntries(new URLSearchParams(await request.text())) as Record<string, string>;
  if (!verifyTwilioSignature(config.apiKey, publicUrl(request), params, request.headers.get("x-twilio-signature") ?? "")) {
    return new Response(null, { status: 403 });
  }
  const status = mapTwilioStatus(params.MessageStatus ?? "");
  if (status && params.MessageSid) {
    await recordProviderStatus({ channel: "sms", providerId: params.MessageSid, status, error: params.ErrorCode ? `TWILIO_${params.ErrorCode}` : undefined });
  }
  return new Response(null, { status: 204 });
}
