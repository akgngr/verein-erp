"use server";

import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { aiPermissions } from "../permissions";
import { deleteAllConversations, deleteConversation, getConversation, listConversations } from "../services/history";
import type { AiProposal } from "../types";

const empty = z.object({}).optional();
const idSchema = z.object({ id: z.string().min(1).max(64) });

/** Kullanıcının kendi sohbetleri (başlık + tarih). */
export async function listAiConversationsAction(): Promise<ActionResult<{ id: string; title: string; updatedAt: string }[]>> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: empty,
    handler: async ({ user }) => (await listConversations(user.id)).map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
  });
  return run({}) as Promise<ActionResult<{ id: string; title: string; updatedAt: string }[]>>;
}

export async function getAiConversationAction(input: unknown): Promise<ActionResult<{ id: string; turns: { role: "user" | "assistant"; content: string; proposals: AiProposal[] }[] }>> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: idSchema,
    handler: async ({ input, user }) => {
      const conversation = await getConversation(user.id, input.id);
      if (!conversation) throw new ActionError("ai.errors.conversationNotFound");
      return { id: conversation.id, turns: conversation.turns.map(({ role, content, proposals }) => ({ role, content, proposals })) };
    },
  });
  return run(input);
}

export async function deleteAiConversationAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: idSchema,
    handler: async ({ input, user, audit }) => {
      if (!(await deleteConversation(user.id, input.id))) throw new ActionError("ai.errors.conversationNotFound");
      await audit({ action: "AI_CONVERSATION_DELETED", entity: "AiConversation", entityId: input.id });
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** Kişinin tüm sohbet geçmişini siler (silme hakkı). */
export async function deleteAllAiConversationsAction(): Promise<ActionResult<{ count: number }>> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: empty,
    handler: async ({ user, audit }) => {
      const count = await deleteAllConversations(user.id);
      await audit({ action: "AI_CONVERSATIONS_DELETED", entity: "AiConversation", after: { count } });
      return { count };
    },
  });
  return run({}) as Promise<ActionResult<{ count: number }>>;
}
