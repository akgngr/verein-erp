"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { MAX_DEAL_AMOUNT } from "../lib/limits";
import { crmPermissions } from "../permissions";
import {
  addActivity,
  addFollowUp,
  addParty,
  canReadSource,
  completeFollowUp,
  deleteDeal,
  getPartyDetail,
  moveDeal,
  removeParty,
  saveDeal,
  searchCandidates,
  SOURCES,
  updateParty,
} from "../services/crm";

/**
 * #582: Kişi adı ve iletişimi kaynak modülün `view` iznine tabidir (services/crm.ts `resolveParties`).
 * Tüm yazma işlemleri denetim kaydı bırakır; not, özet ve kişi adı denetime yazılmaz.
 */

const id = z.string().min(1).max(64);
const STAGES = ["LEAD", "ACTIVE", "CUSTOMER", "INACTIVE"] as const;
const DEAL_STAGES = ["OPEN", "PROPOSAL", "WON", "LOST"] as const;
const KINDS = ["NOTE", "CALL", "MEETING", "EMAIL", "OTHER"] as const;
const actorOf = (user: { id: string; name: string; email: string }) => ({ id: user.id, label: buildUserLabel(user.name, user.email) });
const done = () => revalidatePath("/crm");

export async function searchCandidatesAction(input: unknown) {
  return createAction({
    permission: { definition: crmPermissions, action: "create" },
    schema: z.object({ q: z.string().max(80) }),
    handler: async ({ input, user }) => searchCandidates(input.q, user.role),
  })(input);
}

export async function addPartyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: crmPermissions, action: "create" },
    schema: z.object({ source: z.enum(SOURCES), sourceId: id }),
    handler: async ({ input, user, audit }) => {
      if (!canReadSource(user.role, input.source)) throw new ActionError("crm.errors.sourceForbidden");
      const party = await addParty(input.source, input.sourceId, actorOf(user), user.role);
      if (!party) throw new ActionError("crm.errors.sourceMissing");
      await audit({ action: "CREATE", entity: "CrmParty", entityId: party.id, after: { sourceModule: input.source, sourceId: input.sourceId } });
      done();
      return party;
    },
  })(input);
}

export async function getPartyAction(input: unknown) {
  return createAction({
    permission: { definition: crmPermissions, action: "view" },
    schema: z.object({ id }),
    handler: async ({ input, user }) => {
      const t = await getTranslations("crm");
      const detail = await getPartyDetail(input.id, { role: user.role, restrictedLabel: t("restricted") });
      if (!detail) throw new ActionError("crm.errors.notFound");
      const { party, summary } = detail;
      return {
        id: party.id,
        source: party.sourceModule,
        sourceId: party.sourceId,
        stage: party.stage,
        tags: party.tags,
        ...summary,
        deals: party.deals.map((deal) => ({ id: deal.id, title: deal.title, amountCents: deal.amountCents, stage: deal.stage, expectedCloseAt: deal.expectedCloseAt?.toISOString() ?? null })),
        activities: party.activities.map((item) => ({ id: item.id, kind: item.kind, summary: item.summary, occurredAt: item.occurredAt.toISOString(), by: item.createdByLabel })),
        followUps: party.followUps.map((item) => ({ id: item.id, dueAt: item.dueAt.toISOString(), note: item.note, done: Boolean(item.doneAt) })),
      };
    },
  })(input);
}

export async function updatePartyAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ id, stage: z.enum(STAGES).optional(), tags: z.array(z.string().trim().max(40)).max(20).optional() }),
    handler: async ({ input, audit }) => {
      const result = await updateParty(input.id, { stage: input.stage, tags: input.tags });
      if (!result) throw new ActionError("crm.errors.notFound");
      await audit({ action: "UPDATE", entity: "CrmParty", entityId: input.id, before: result.before, after: result.after });
      done();
      return null;
    },
  })(input);
}

export async function removePartyAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "delete" },
    schema: z.object({ id }),
    handler: async ({ input, audit }) => {
      const before = await removeParty(input.id);
      if (!before) throw new ActionError("crm.errors.notFound");
      await audit({ action: "DELETE", entity: "CrmParty", entityId: input.id, before });
      done();
      return null;
    },
  })(input);
}

export async function addActivityAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ partyId: id, kind: z.enum(KINDS), summary: z.string().trim().min(2, "crm.errors.summary").max(4000), dealId: id.nullable().optional() }),
    handler: async ({ input, user, audit }) => {
      const activity = await addActivity(input.partyId, input, actorOf(user));
      if (!activity) throw new ActionError("crm.errors.notFound");
      await audit({ action: "CREATE", entity: "CrmActivity", entityId: activity.id, after: { partyId: input.partyId, dealId: input.dealId ?? null, kind: input.kind } });
      done();
      return null;
    },
  })(input);
}

export async function saveDealAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({
      id: id.optional(),
      partyId: id,
      title: z.string().trim().min(2, "crm.errors.title").max(200),
      amount: z.number().min(0, "crm.errors.amount").max(MAX_DEAL_AMOUNT, "crm.errors.amountMax").nullable(),
      expectedCloseAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }),
    handler: async ({ input, audit }) => {
      const saved = await saveDeal({
        id: input.id,
        partyId: input.partyId,
        title: input.title,
        amountCents: input.amount === null ? null : Math.round(input.amount * 100),
        expectedCloseAt: input.expectedCloseAt ? new Date(`${input.expectedCloseAt}T12:00:00`) : null,
      });
      if (!saved) throw new ActionError("crm.errors.notFound");
      await audit({ action: saved.before ? "UPDATE" : "CREATE", entity: "CrmDeal", entityId: saved.id, before: saved.before, after: saved.after });
      done();
      return { id: saved.id };
    },
  })(input);
}

export async function moveDealAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ id, stage: z.enum(DEAL_STAGES) }),
    handler: async ({ input, user, audit }) => {
      const t = await getTranslations("crm");
      const moved = await moveDeal(input.id, input.stage, actorOf(user), t("dealMoved", { stage: t(`dealStages.${input.stage}`) }));
      if (!moved) throw new ActionError("crm.errors.notFound");
      if (moved.changed) {
        await audit({ action: "STATUS_CHANGE", entity: "CrmDeal", entityId: input.id, before: { stage: moved.from }, after: { stage: moved.to } });
      }
      done();
      return null;
    },
  })(input);
}

export async function deleteDealAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "delete" },
    schema: z.object({ id }),
    handler: async ({ input, audit }) => {
      const before = await deleteDeal(input.id);
      if (!before) throw new ActionError("crm.errors.notFound");
      await audit({ action: "DELETE", entity: "CrmDeal", entityId: input.id, before });
      done();
      return null;
    },
  })(input);
}

export async function addFollowUpAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ partyId: id, dueAt: z.string().datetime(), note: z.string().trim().min(2, "crm.errors.summary").max(500), dealId: id.nullable().optional() }),
    handler: async ({ input, user, audit }) => {
      const followUp = await addFollowUp(input.partyId, { dueAt: new Date(input.dueAt), note: input.note, dealId: input.dealId, assigneeId: user.id });
      if (!followUp) throw new ActionError("crm.errors.notFound");
      await audit({ action: "CREATE", entity: "CrmFollowUp", entityId: followUp.id, after: { partyId: followUp.partyId, dealId: followUp.dealId, dueAt: followUp.dueAt } });
      done();
      return null;
    },
  })(input);
}

export async function completeFollowUpAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ id, done: z.boolean() }),
    handler: async ({ input, audit }) => {
      if (!(await completeFollowUp(input.id, input.done))) throw new ActionError("crm.errors.notFound");
      await audit({ action: "UPDATE", entity: "CrmFollowUp", entityId: input.id, after: { done: input.done } });
      done();
      return null;
    },
  })(input);
}
