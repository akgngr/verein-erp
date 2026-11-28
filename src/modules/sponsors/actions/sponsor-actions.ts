"use server";

import { revalidatePath } from "next/cache";

import { ActionError, createAction } from "@/modules/auth/server";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { sponsorCreatedEvent } from "../automation";
import { sponsorsPermissions } from "../permissions";
import {
  parseOptionalIsoDate,
  parseSponsorAmountCents,
  sponsorDeleteSchema,
  sponsorFormSchema,
  sponsorUpdateSchema,
} from "../schemas/sponsor-schema";

export async function createSponsorAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: sponsorsPermissions, action: "create" },
    schema: sponsorFormSchema,
    handler: async ({ input, audit }) => {
      const amountCents = parseSponsorAmountCents(input.amount);
      const created = await getDb().sponsor.create({
        data: {
          name: input.name,
          tier: input.tier,
          status: input.status,
          amountCents,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail || null,
          contactPhone: input.contactPhone || null,
          website: input.website || null,
          startDate: parseOptionalIsoDate(input.startDate),
          endDate: parseOptionalIsoDate(input.endDate),
          notes: input.notes || null,
        },
      });
      await audit({
        action: "CREATE",
        entity: "Sponsor",
        entityId: created.id,
        after: {
          name: created.name,
          tier: created.tier,
          status: created.status,
          amountCents: created.amountCents,
        },
      });
      await emitAutomationEvent(sponsorCreatedEvent, {
        sponsorId: created.id,
        tier: input.tier,
        status: input.status,
      }).catch(() => false);
      revalidatePath("/sponsors");
      return { id: created.id };
    },
  })(input);
}

export async function updateSponsorAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: sponsorsPermissions, action: "update" },
    schema: sponsorUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.sponsor.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("sponsors.errors.notFound");
      const amountCents = parseSponsorAmountCents(input.amount);
      const updated = await db.sponsor.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          tier: input.tier,
          status: input.status,
          amountCents,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail || null,
          contactPhone: input.contactPhone || null,
          website: input.website || null,
          startDate: parseOptionalIsoDate(input.startDate),
          endDate: parseOptionalIsoDate(input.endDate),
          notes: input.notes || null,
        },
      });
      await audit({
        action: "UPDATE",
        entity: "Sponsor",
        entityId: updated.id,
        before: {
          name: existing.name,
          tier: existing.tier,
          status: existing.status,
          amountCents: existing.amountCents,
        },
        after: {
          name: updated.name,
          tier: updated.tier,
          status: updated.status,
          amountCents: updated.amountCents,
        },
      });
      revalidatePath("/sponsors");
      return { id: updated.id };
    },
  })(input);
}

export async function deleteSponsorAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: sponsorsPermissions, action: "delete" },
    schema: sponsorDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.sponsor.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("sponsors.errors.notFound");
      await db.sponsor.delete({ where: { id: existing.id } });
      await audit({
        action: "DELETE",
        entity: "Sponsor",
        entityId: existing.id,
        before: {
          name: existing.name,
          tier: existing.tier,
          status: existing.status,
        },
      });
      revalidatePath("/sponsors");
      return { id: existing.id };
    },
  })(input);
}
