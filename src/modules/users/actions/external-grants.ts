"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { usersPermissions } from "../permissions";
import { createExternalGrant, revokeExternalGrant } from "../services/external-grants";

export async function createExternalGrantAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({
      userId: z.string().min(1),
      moduleScope: z.enum(["accounting", "finance"]).nullable().optional(),
      startsAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
      note: z.string().trim().max(250).nullable().optional(),
    }),
    handler: async ({ input, user }) => {
      try {
        const created = await createExternalGrant({
          userId: input.userId,
          moduleScope: input.moduleScope ?? null,
          startsAt: new Date(input.startsAt),
          expiresAt: new Date(input.expiresAt),
          note: input.note ?? null,
          actorUserId: user.id,
          actorUserLabel: buildUserLabel(user.name, user.email),
        });
        revalidatePath("/ayarlar/kullanicilar");
        return { id: created.id };
      } catch (error) {
        if (error instanceof Error && error.message === "exceedsMaxDuration") {
          throw new ActionError("users.errors.grantExceedsMaxDuration");
        }
        if (error instanceof Error && error.message === "endBeforeStart") {
          throw new ActionError("users.errors.grantEndBeforeStart");
        }
        throw error;
      }
    },
  })(input);
}

export async function revokeExternalGrantAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({
      grantId: z.string().min(1),
      userId: z.string().min(1),
    }),
    handler: async ({ input, user }) => {
      try {
        const updated = await revokeExternalGrant({
          grantId: input.grantId,
          expectedUserId: input.userId,
          actorUserId: user.id,
          actorUserLabel: buildUserLabel(user.name, user.email),
        });
        revalidatePath("/ayarlar/kullanicilar");
        return { id: updated.id };
      } catch (error) {
        if (error instanceof Error && error.message === "notFound") {
          throw new ActionError("users.errors.notFound");
        }
        throw error;
      }
    },
  })(input);
}
