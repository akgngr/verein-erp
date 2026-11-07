import { getChannelConfig, recordProviderStatus } from "@/modules/mailings/server";

import { mapSevenStatus, verifySevenSecret } from "../../../../services/webhook";

type SevenPayload = { webhook_event?: string; data?: { msg_id?: string | number; id?: string | number; status?: string; status_time?: string } };

/**
 * POST /api/campaign-sms/webhook/seven/<gizli> — seven.io teslim raporu (DLR). Oturum yok; adresteki
 * gizli değer API anahtarından türetilir ve Kampanyalar → Ayarlar'da gösterilir. Bilinmeyen olaylar yok sayılır.
 */
export async function POST(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  const config = await getChannelConfig("sms");
  if (config.provider !== "seven" || !config.apiKey || !verifySevenSecret(config.apiKey, secret)) return new Response(null, { status: 404 });
  const payload = (await request.json().catch(() => ({}))) as SevenPayload;
  const id = payload.data?.msg_id ?? payload.data?.id;
  const status = mapSevenStatus(payload.data?.status ?? "");
  if ((payload.webhook_event ?? "dlr") === "dlr" && id !== undefined && status) {
    const at = payload.data?.status_time ? new Date(payload.data.status_time) : undefined;
    await recordProviderStatus({ channel: "sms", providerId: String(id), status, at: at && !Number.isNaN(at.getTime()) ? at : undefined });
  }
  return new Response(null, { status: 204 });
}
