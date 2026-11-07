"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { sepaPermissions } from "../permissions";
import { cancelRun, createRun, creditorProblems, markCollected, markReturned, previewRun } from "../services/runs";

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "sepa.errors.date");
const source = z.discriminatedUnion("source", [
  z.object({ source: z.literal("MEMBER_DUES"), param: z.string().regex(/^\d{4}$/, "sepa.errors.year") }),
  z.object({ source: z.literal("COURSE_FEES"), param: date }),
]);
const actorOf = (user: { id: string; name: string; email: string }) => ({ id: user.id, label: buildUserLabel(user.name, user.email) });
async function labels() {
  const t = await getTranslations({ locale: "de", namespace: "sepa.remittance" });
  return { dues: (year: number) => t("dues", { year }), course: (code: string, label: string) => t("course", { code, label }) };
}

export async function previewRunAction(input: unknown) {
  return createAction({
    permission: { definition: sepaPermissions, action: "create" },
    schema: source,
    handler: async ({ input }) => ({ ...(await previewRun(input.source, input.param, await labels())), problems: await creditorProblems() }),
  })(input);
}

export async function createRunAction(input: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  return createAction({
    permission: { definition: sepaPermissions, action: "create" },
    schema: z.intersection(source, z.object({ collectionDate: date, sourceKeys: z.array(z.string().max(140)).max(5000).nullable() })),
    handler: async ({ input, user, audit }) => {
      const problems = await creditorProblems();
      if (problems.includes("ownIban")) throw new ActionError("sepa.errors.ownIban");
      if (problems.includes("creditorId")) throw new ActionError("sepa.errors.creditorId");
      if (input.collectionDate < new Date().toISOString().slice(0, 10)) throw new ActionError("sepa.errors.pastDate");
      const run = await createRun(input.source, input.param, input.collectionDate, input.sourceKeys, actorOf(user), await labels());
      if (!run) throw new ActionError("sepa.errors.nothingToCollect");
      await audit({ action: "CREATE", entity: "SepaDebitRun", entityId: run.id, after: { number: run.number } });
      revalidatePath("/muhasebe/sepa");
      return run;
    },
  })(input);
}

export async function markCollectedAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: sepaPermissions, action: "update" },
    schema: z.object({ id, collectedAt: date }),
    handler: async ({ input, user, audit }) => {
      if (!(await markCollected(input.id, input.collectedAt, actorOf(user)))) throw new ActionError("sepa.errors.notOpen");
      await audit({ action: "UPDATE", entity: "SepaDebitRun", entityId: input.id, after: { collectedAt: input.collectedAt } });
      revalidatePath(`/muhasebe/sepa/${input.id}`);
      return null;
    },
  })(input);
}

export async function markReturnedAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: sepaPermissions, action: "update" },
    schema: z.object({ runId: id, itemId: id, reason: z.string().trim().min(2, "sepa.errors.reason").max(200) }),
    handler: async ({ input, user, audit }) => {
      if (!(await markReturned(input.itemId, input.reason, actorOf(user)))) throw new ActionError("sepa.errors.notCollected");
      await audit({ action: "UPDATE", entity: "SepaDebitItem", entityId: input.itemId, after: { returned: true } });
      revalidatePath(`/muhasebe/sepa/${input.runId}`);
      return null;
    },
  })(input);
}

export async function cancelRunAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: sepaPermissions, action: "delete" },
    schema: z.object({ id }),
    handler: async ({ input, audit }) => {
      if (!(await cancelRun(input.id))) throw new ActionError("sepa.errors.notOpen");
      await audit({ action: "UPDATE", entity: "SepaDebitRun", entityId: input.id, after: { cancelled: true } });
      revalidatePath("/muhasebe/sepa");
      return null;
    },
  })(input);
}
