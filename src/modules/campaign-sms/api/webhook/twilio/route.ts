import { getChannelConfig, recordProviderStatus } from "@/modules/mailings/server";
import { resolvePublicOrigin } from "@/shared/security/public-origin";

import { mapTwilioStatus, verifyTwilioSignature } from "../../../services/webhook";

/** Kanonik genel istek adresi (APP_URL): Twilio imzayı bu adresle doğrular, Host başlığına güvenilmez. */
function publicUrl(request: Request): string | null {
  const origin = resolvePublicOrigin(request.headers);
  if (!origin) return null;
  const url = new URL(request.url);
  return `${origin}${url.pathname}${url.search}`;
}

/**
 * POST /api/campaign-sms/webhook/twilio — Twilio SMS durum bildirimi (StatusCallback). Oturum yok;
 * X-Twilio-Signature Auth Token ile doğrulanır. SMS'te okundu bilgisi yoktur; yalnız teslim/başarısız.
 */
export async function POST(request: Request) {
  const config = await getChannelConfig("sms");
  if (config.provider !== "twilio" || !config.apiKey) return new Response(null, { status: 404 });
  const webhookUrl = publicUrl(request);
  if (!webhookUrl) return new Response(null, { status: 500 });
  const params = Object.fromEntries(new URLSearchParams(await request.text())) as Record<string, string>;
  if (!verifyTwilioSignature(config.apiKey, webhookUrl, params, request.headers.get("x-twilio-signature") ?? "")) {
    return new Response(null, { status: 403 });
  }
  const status = mapTwilioStatus(params.MessageStatus ?? "");
  if (status && params.MessageSid) {
    await recordProviderStatus({ channel: "sms", providerId: params.MessageSid, status, error: params.ErrorCode ? `TWILIO_${params.ErrorCode}` : undefined });
  }
  return new Response(null, { status: 204 });
}
