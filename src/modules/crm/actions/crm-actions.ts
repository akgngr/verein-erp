"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { crmPermissions } from "../permissions";
import {
  addActivity,
  addFollowUp,
  addParty,
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
    handler: async ({ input }) => searchCandidates(input.q),
  })(input);
}

export async function addPartyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: crmPermissions, action: "create" },
    schema: z.object({ source: z.enum(SOURCES), sourceId: id }),
    handler: async ({ input, user }) => {
      const party = await addParty(input.source, input.sourceId, actorOf(user));
      if (!party) throw new ActionError("crm.errors.sourceMissing");
      done();
      return party;
    },
  })(input);
}

export async function getPartyAction(input: unknown) {
  return createAction({
    permission: { definition: crmPermissions, action: "view" },
    schema: z.object({ id }),
    handler: async ({ input }) => {
      const detail = await getPartyDetail(input.id);
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
    handler: async ({ input }) => {
      await updateParty(input.id, { stage: input.stage, tags: input.tags });
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
      await removeParty(input.id);
      await audit({ action: "DELETE", entity: "CrmParty", entityId: input.id });
      done();
      return null;
    },
  })(input);
}

export async function addActivityAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ partyId: id, kind: z.enum(KINDS), summary: z.string().trim().min(2, "crm.errors.summary").max(4000), dealId: id.nullable().optional() }),
    handler: async ({ input, user }) => {
      await addActivity(input.partyId, input, actorOf(user));
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
      amount: z.number().min(0).max(100_000_000).nullable(),
      expectedCloseAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }),
    handler: async ({ input }) => {
      const saved = await saveDeal({
        id: input.id,
        partyId: input.partyId,
        title: input.title,
        amountCents: input.amount === null ? null : Math.round(input.amount * 100),
        expectedCloseAt: input.expectedCloseAt ? new Date(`${input.expectedCloseAt}T12:00:00`) : null,
      });
      done();
      return saved;
    },
  })(input);
}

export async function moveDealAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ id, stage: z.enum(DEAL_STAGES) }),
    handler: async ({ input, user }) => {
      const t = await getTranslations("crm");
      await moveDeal(input.id, input.stage, actorOf(user), t("dealMoved", { stage: t(`dealStages.${input.stage}`) }));
      done();
      return null;
    },
  })(input);
}

export async function deleteDealAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "delete" },
    schema: z.object({ id }),
    handler: async ({ input }) => {
      await deleteDeal(input.id);
      done();
      return null;
    },
  })(input);
}

export async function addFollowUpAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ partyId: id, dueAt: z.string().datetime(), note: z.string().trim().min(2, "crm.errors.summary").max(500), dealId: id.nullable().optional() }),
    handler: async ({ input, user }) => {
      await addFollowUp(input.partyId, { dueAt: new Date(input.dueAt), note: input.note, dealId: input.dealId, assigneeId: user.id });
      done();
      return null;
    },
  })(input);
}

export async function completeFollowUpAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: crmPermissions, action: "update" },
    schema: z.object({ id, done: z.boolean() }),
    handler: async ({ input }) => {
      await completeFollowUp(input.id, input.done);
      done();
      return null;
    },
  })(input);
}
