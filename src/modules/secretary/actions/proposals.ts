"use server";

import { revalidatePath } from "next/cache";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { proposalConfirmSchema, proposalRefSchema } from "../schemas/item-state";
import { defaultProposalDeps } from "../services/proposal-store";
import { confirmProposal, dismissProposal, ProposalError } from "../services/proposals";

/**
 * Öneriyi onaylar: hedef modül eylemi çalışır. Yetki iki kez denetlenir (sekreter görüntüleme +
 * eylemin kendi yetkisi, çalışma anında). Audit'e yalnız meta veri yazılır (payload yok).
 */
export async function confirmProposalAction(input: unknown): Promise<ActionResult<{ href?: string }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: proposalConfirmSchema,
    handler: async ({ input, user, audit }) => {
      try {
        const result = await confirmProposal({ id: user.id, role: user.role }, input, await defaultProposalDeps(), new Date());
        await audit({ action: "APPROVE", entity: "SecretaryProposal", entityId: input.id, after: { module: result.moduleKey, action: result.actionKey, status: result.status } });
        revalidatePath("/sekreter");
        return { href: result.href };
      } catch (error) {
        if (error instanceof ProposalError) {
          await audit({ action: "REJECT", entity: "SecretaryProposal", entityId: input.id, after: { reason: error.message.split(".").at(-1) } });
          throw new ActionError(error.message);
        }
        throw error;
      }
    },
  })(input);
}

/** Öneriyi reddeder; kaynak kayıt değişmez. */
export async function dismissProposalAction(input: unknown): Promise<ActionResult<{ dismissed: boolean }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: proposalRefSchema,
    handler: async ({ input, user, audit }) => {
      const dismissed = await dismissProposal({ id: user.id }, input.id, await defaultProposalDeps(), new Date());
      if (dismissed) await audit({ action: "UPDATE", entity: "SecretaryProposal", entityId: input.id, after: { status: "DISMISSED" } });
      revalidatePath("/sekreter");
      return { dismissed };
    },
  })(input);
}
