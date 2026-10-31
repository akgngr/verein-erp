import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import type { AiFile, AiProposal } from "../types";

/** Sohbetler bu süreden sonra otomatik silinir (veri minimizasyonu). */
export const AI_CONVERSATION_RETENTION_DAYS = 180;
/** Modele gönderilen en fazla geçmiş mesaj sayısı. */
export const AI_HISTORY_WINDOW = 40;

const PURPOSE = "ai-chat-history";
const seal = (text: string) => sealSecret(PURPOSE, text);
const open = (payload: string) => openSecret(PURPOSE, payload) ?? "";

export type StoredTurn = { id: string; role: "user" | "assistant"; content: string; proposals: AiProposal[]; files: AiFile[]; createdAt: Date };

/** Eski kayıtlar yalnızca öneri dizisi saklar; yenileri { proposals, files }. */
function parseExtras(raw: string | null): { proposals: AiProposal[]; files: AiFile[] } {
  if (!raw) return { proposals: [], files: [] };
  const value = JSON.parse(open(raw) || "[]") as unknown;
  if (Array.isArray(value)) return { proposals: value as AiProposal[], files: [] };
  const extras = value as { proposals?: AiProposal[]; files?: AiFile[] };
  return { proposals: extras.proposals ?? [], files: extras.files ?? [] };
}

async function purgeExpired(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - AI_CONVERSATION_RETENTION_DAYS * 86_400_000);
  await getDb().aiConversation.deleteMany({ where: { userId, updatedAt: { lt: cutoff } } });
}

export async function listConversations(userId: string): Promise<{ id: string; title: string; updatedAt: Date }[]> {
  await purgeExpired(userId);
  const rows = await getDb().aiConversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, titleEnc: true, updatedAt: true } });
  return rows.map((row) => ({ id: row.id, title: open(row.titleEnc), updatedAt: row.updatedAt }));
}

/** Sohbet yalnızca sahibine döner; başkasının kimliği verilirse null. */
export async function getConversation(userId: string, conversationId: string): Promise<{ id: string; title: string; turns: StoredTurn[] } | null> {
  const row = await getDb().aiConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: open(row.titleEnc),
    turns: row.messages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: open(message.contentEnc),
      ...parseExtras(message.proposalsEnc),
      createdAt: message.createdAt,
    })),
  };
}

export async function createConversation(userId: string, firstMessage: string): Promise<string> {
  const title = firstMessage.replace(/\s+/g, " ").trim().slice(0, 80);
  const row = await getDb().aiConversation.create({ data: { userId, titleEnc: seal(title) } });
  return row.id;
}

export async function appendTurns(conversationId: string, turns: { role: "user" | "assistant"; content: string; proposals?: AiProposal[]; files?: AiFile[] }[]): Promise<void> {
  const db = getDb();
  await db.$transaction([
    ...turns.map((turn) =>
      db.aiMessage.create({
        data: {
          conversationId,
          role: turn.role,
          contentEnc: seal(turn.content),
          proposalsEnc: turn.proposals?.length || turn.files?.length ? seal(JSON.stringify({ proposals: turn.proposals ?? [], files: turn.files ?? [] })) : null,
        },
      }),
    ),
    db.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const result = await getDb().aiConversation.deleteMany({ where: { id: conversationId, userId } });
  return result.count > 0;
}

export async function deleteAllConversations(userId: string): Promise<number> {
  return (await getDb().aiConversation.deleteMany({ where: { userId } })).count;
}
