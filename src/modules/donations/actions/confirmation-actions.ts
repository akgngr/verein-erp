"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { donationsPermissions } from "../permissions";
import { cancelConfirmationSchema, issueConfirmationSchema } from "../schemas/confirmation";
import {
  issueCollectiveDonationConfirmation,
  issueMembershipFeeConfirmation,
  issueSingleDonationConfirmation,
  IssueError,
} from "../services/issue-confirmation";

/**
 * Bildirim aksiyonları (§ 11 md. 9-10): izin approve; ReadinessError mesajı
 * eksiklerin LİSTESİYLE ActionError'a çevrilir (§ 18 kabul: all missing items).
 */

export async function issueConfirmationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; confirmationNumber: string }>> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "approve" },
    schema: issueConfirmationSchema,
    handler: async ({ input, user }) => {
      const label = buildUserLabel(user.name, user.email);
      const actor = { id: user.id, label };
      try {
        if (input.content === "DONATION" && input.kind === "SINGLE") {
          return await issueSingleDonationConfirmation(actor, input.donationId);
        }
        if (input.content === "DONATION" && input.kind === "COLLECTIVE") {
          const from = input.periodFrom;
          const to = input.periodTo;
          return await issueCollectiveDonationConfirmation(actor, {
            donorId: input.donorId,
            periodFrom: new Date(`${from}T00:00:00Z`),
            periodTo: new Date(`${to}T00:00:00Z`),
            donationIds: input.donationIds,
          });
        }
        return await issueMembershipFeeConfirmation(actor, {
          memberId: input.memberId,
          year: input.year,
        });
      } catch (error) {
        if (error instanceof IssueError) throw new ActionError(error.message);
        throw error;
      }
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; confirmationNumber: string }>>;
}

export async function cancelConfirmationAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "delete" },
    schema: cancelConfirmationSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const confirmation = await db.zuwendungConfirmation.findUnique({
        where: { id: input.id },
        select: { id: true, confirmationNumber: true, status: true },
      });
      if (!confirmation) throw new ActionError("Bildirim bulunamadı.");
      if (confirmation.status !== "ISSUED") {
        throw new ActionError("Bu bildirim zaten iptal edilmiş.");
      }

      const label = buildUserLabel(user.name, user.email);
      const now = new Date();
      await db.$transaction(async (tx) => {
        await tx.zuwendungConfirmation.update({
          where: { id: confirmation.id },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelledById: user.id,
            cancelledByLabel: label,
            cancelReason: input.reason,
          },
        });
        // Ögeler serbest kalır (activeKey NULL) — yeniden bildirim mümkün (§ 11 md. 10).
        await tx.zuwendungConfirmationItem.updateMany({
          where: { confirmationId: confirmation.id, activeKey: { not: null } },
          data: { activeKey: null },
        });
      });

      // Depolanan PDF DOKUNULMAZ (bayt aynı; § 11 md. 10 — yeniden işaretlenmez).
      await audit({
        action: "CANCEL",
        entity: "ZuwendungConfirmation",
        entityId: confirmation.id,
        before: { confirmationNumber: confirmation.confirmationNumber, status: "ISSUED" },
        after: { confirmationNumber: confirmation.confirmationNumber, reason: input.reason },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
