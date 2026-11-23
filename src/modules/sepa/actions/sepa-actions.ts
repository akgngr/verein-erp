"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { canRequestRenewal, requestMandateRenewal } from "@/modules/online-forms/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { sepaPermissions } from "../permissions";
import { DEFAULT_MAX_RETURNS, RETURN_CODE_LIST } from "../lib/mandate-health";
import { mandateHealth } from "../services/health";
import { cancelRun, candidates, createRun, creditorProblems, markCollected, markReturned, previewRun } from "../services/runs";

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "sepa.errors.date");
const source = z.discriminatedUnion("source", [
  z.object({ source: z.literal("MEMBER_DUES"), param: z.string().regex(/^\d{4}$/, "sepa.errors.year") }),
  z.object({ source: z.literal("COURSE_FEES"), param: date }),
]);
/** İade eşiği: kaç iadeden sonra tahsilat duraklatılır (12 ay içinde). */
const maxReturns = z.number().int().min(1).max(10).default(DEFAULT_MAX_RETURNS);
const actorOf = (user: { id: string; name: string; email: string }) => ({ id: user.id, label: buildUserLabel(user.name, user.email) });
async function labels() {
  const t = await getTranslations({ locale: "de", namespace: "sepa.remittance" });
  return { dues: (year: number) => t("dues", { year }), course: (code: string, label: string) => t("course", { code, label }) };
}

export async function previewRunAction(input: unknown) {
  return createAction({
    permission: { definition: sepaPermissions, action: "create" },
    schema: z.intersection(source, z.object({ maxReturns })),
    handler: async ({ input }) => ({ ...(await previewRun(input.source, input.param, await labels(), input.maxReturns)), problems: await creditorProblems() }),
  })(input);
}

export async function createRunAction(input: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  return createAction({
    permission: { definition: sepaPermissions, action: "create" },
    schema: z.intersection(source, z.object({ collectionDate: date, sourceKeys: z.array(z.string().max(140)).max(5000).nullable(), maxReturns })),
    handler: async ({ input, user, audit }) => {
      const problems = await creditorProblems();
      if (problems.includes("ownIban")) throw new ActionError("sepa.errors.ownIban");
      if (problems.includes("creditorId")) throw new ActionError("sepa.errors.creditorId");
      if (input.collectionDate < new Date().toISOString().slice(0, 10)) throw new ActionError("sepa.errors.pastDate");
      const run = await createRun(input.source, input.param, input.collectionDate, input.sourceKeys, actorOf(user), await labels(), input.maxReturns);
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
    schema: z.object({
      runId: id,
      itemId: id,
      code: z.enum(RETURN_CODE_LIST as [string, ...string[]]).nullable().default(null),
      reason: z.string().trim().max(200).default(""),
      feeCents: z.number().int().min(0).max(100_000).nullable().default(null),
    }).refine((value) => value.code !== null || value.reason.length >= 2, { message: "sepa.errors.reason", path: ["reason"] }),
    handler: async ({ input, user, audit }) => {
      const reason = input.reason || input.code!;
      if (!(await markReturned(input.itemId, { reason, code: input.code, feeCents: input.feeCents }, actorOf(user)))) throw new ActionError("sepa.errors.notCollected");
      // Denetim kaydı yalnız kod ve ücret tutar; serbest metin (kişi bilgisi içerebilir) yazılmaz.
      await audit({ action: "UPDATE", entity: "SepaDebitItem", entityId: input.itemId, after: { returned: true, code: input.code, feeCents: input.feeCents } });
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

/** Mandat sağlık taraması + iade koçu (salt okuma; hiçbir şey yazılmaz veya gönderilmez). */
export async function mandateHealthAction(input: unknown) {
  return createAction({
    permission: { definition: sepaPermissions, action: "view" },
    schema: z.intersection(source, z.object({ maxReturns })),
    handler: async ({ input, user }) => mandateHealth(input.source, input.param, await labels(), input.maxReturns, user.role),
  })(input);
}

/**
 * e-imza ile SEPA yetki yenileme bağlantısı (#521). Hedef istemciden alınmaz: kaynak + kaynak anahtarından sunucuda
 * çözülür (başka kişiye bağlantı gönderilemez). Açık onaydan sonra çağrılır; mevcut online-forms akışını kullanır.
 */
export async function requestMandateRenewalAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: sepaPermissions, action: "update" },
    schema: z.intersection(source, z.object({ sourceKey: z.string().min(1).max(140), channel: z.enum(["email", "sms", "whatsapp"]) })),
    handler: async ({ input, user, audit }) => {
      if (!(await listUsableModuleKeys()).includes("online-forms")) throw new ActionError("sepa.errors.renewalUnavailable");
      const subject = (await candidates(input.source, input.param, await labels())).find((item) => item.sourceKey === input.sourceKey)?.subject;
      if (!subject) throw new ActionError("sepa.errors.renewalTarget");
      if (!canRequestRenewal(user.role, subject.kind)) throw new ActionError("sepa.errors.renewalForbidden");
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      if (!host) throw new ActionError("sepa.errors.renewalFailed");
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      const result = await requestMandateRenewal(subject, input.channel, actorOf(user), `${proto}://${host}`);
      if (!result.ok) throw new ActionError(result.error === "noAddress" ? "sepa.errors.renewalNoAddress" : "sepa.errors.renewalFailed");
      // Denetim: yalnız kimlikler ve kanal; adres veya ad yazılmaz.
      await audit({ action: "CREATE", entity: "OnlineFormRequest", entityId: result.id, after: { purpose: "sepaMandateRenewal", kind: subject.kind, channel: input.channel } });
      revalidatePath("/muhasebe/sepa");
      return { id: result.id };
    },
  })(input);
}

