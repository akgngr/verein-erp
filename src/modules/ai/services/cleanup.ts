import "server-only";
import { getDb } from "@/shared/db";
import { aiRetentionCutoff } from "./retention";

/** Runs without Next request context; deletes aged messages even in active conversations. */
export async function cleanupAiHistory(now = new Date(), userId?: string) {
  const cutoff = aiRetentionCutoff(now);
  const db = getDb();
  const [messageIds,conversationIds,reportIds]=await Promise.all([
    db.aiMessage.findMany({where:{createdAt:{lte:cutoff},...(userId?{conversation:{userId}}:{})},select:{id:true},take:500}),
    db.aiConversation.findMany({where:{updatedAt:{lte:cutoff},...(userId?{userId}:{})},select:{id:true},take:500}),
    db.aiReport.findMany({where:{createdAt:{lte:cutoff},...(userId?{userId}:{})},select:{id:true},take:500}),
  ]);
  const [messages, conversations, reports] = await db.$transaction([
    db.aiMessage.deleteMany({where:{id:{in:messageIds.map(row=>row.id)}}}),
    db.aiConversation.deleteMany({where:{id:{in:conversationIds.map(row=>row.id)},updatedAt:{lte:cutoff}}}),
    db.aiReport.deleteMany({where:{id:{in:reportIds.map(row=>row.id)}}}),
  ]);
  await db.$transaction([
    db.aiExportRequest.deleteMany({where:{...(userId?{userId}:{}),expiresAt:{lte:cutoff}}}),
    db.aiReferenceScope.deleteMany({where:{...(userId?{userId}:{}),OR:[{expiresAt:{lte:now}},{revokedAt:{not:null}}]}}),
    db.aiProposal.deleteMany({where:{...(userId?{userId}:{}),expiresAt:{lte:now},status:{not:"EXECUTING"}}}),
    db.aiTurnClaim.deleteMany({where:{...(userId?{userId}:{}),createdAt:{lte:cutoff}}}),
    db.aiUsageBucket.deleteMany({where:{windowStart:{lt:new Date(now.getTime()-2*86_400_000)},...(userId?{scopeKey:{endsWith:`:${userId}`}}:{})}}),
  ]);
  return { messages: messages.count, conversations: conversations.count, reports: reports.count };
}
