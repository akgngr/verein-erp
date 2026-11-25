import "server-only";

import { getDb } from "@/shared/db";

/** #583: Etkin dış kanalların anahtarları (sağlık kokpiti). Sır veya ayar döndürülmez. */
export async function listEnabledNotificationChannels(): Promise<string[]> {
  const rows = await getDb().notificationChannelConfig.findMany({ where: { enabled: true }, select: { channel: true }, orderBy: { channel: "asc" } });
  return rows.map((row) => row.channel);
}
