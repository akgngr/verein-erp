import "server-only";
import { getDb } from "@/shared/db";
import { aiRetentionCutoff } from "./retention";

/** Runs without Next request context; deletes aged messages even in active conversations. */
export async function cleanupAiHistory(now = new Date(), userId?: string) {
  const cutoff = aiRetentionCutoff(now);
  const db = getDb();
  const [messages, conversations, reports] = await db.$transaction([
    db.aiMessage.deleteMany({ where: { createdAt: { lte: cutoff }, ...(userId ? { conversation: { userId } } : {}) } }),
    db.aiConversation.deleteMany({ where: { updatedAt: { lte: cutoff }, ...(userId ? { userId } : {}) } }),
    db.aiReport.deleteMany({ where: { createdAt: { lte: cutoff }, ...(userId ? { userId } : {}) } }),
  ]);
  return { messages: messages.count, conversations: conversations.count, reports: reports.count };
}
