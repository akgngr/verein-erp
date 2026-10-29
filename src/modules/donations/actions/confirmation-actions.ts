"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { donationsPermissions } from "../permissions";
import {
  cancelConfirmationSchema,
  issueBatchSchema,
  issueConfirmationSchema,
  reissueConfirmationSchema,
} from "../schemas/confirmation";
import {
  issueBatchConfirmations,
  issueCollectiveDonationConfirmation,
  issueMembershipFeeConfirmation,
  issueSingleDonationConfirmation,
  IssueError,
} from "../services/issue-confirmation";
import { ReadinessError } from "../services/issue-guards";

/** Servis hatalarını kullanıcıya gösterilecek ActionError'a çevirir (eksik listesi dahil). */
function toActionError(error: unknown): unknown {
  if (error instanceof IssueError) return new ActionError(error.message, undefined, error.values);
  if (error instanceof ReadinessError) return new ActionError(error.message);
  return error;
}

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
        throw toActionError(error);
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
      if (!confirmation) throw new ActionError("donations.errors.confirmationNotFound");
      if (confirmation.status !== "ISSUED") {
        throw new ActionError("donations.errors.confirmationAlreadyCancelled");
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

/** Yıllık toplu üretim (§ 11 md. 9 md. 4): alıcı başına sonuç; bir alıcının hatası diğerlerini durdurmaz. */
export async function issueBatchAction(
  input: unknown,
): Promise<ActionResult<Array<{ recipientId: string; ok: boolean; confirmationNumber?: string; error?: string }>>> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "approve" },
    schema: issueBatchSchema,
    handler: async ({ input, user }) => {
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      return issueBatchConfirmations(actor, input);
    },
  });

  return run(input) as Promise<
    ActionResult<Array<{ recipientId: string; ok: boolean; confirmationNumber?: string; error?: string }>>
  >;
}

/**
 * "Yerine yenisini oluştur" (§ 15 md. 7): iptal edilmiş bildirimin AYNI ögeleri
 * (hâlâ bildirilebilir olanlar) için yeni bildirim; yenisi replacesId ile eskisine bağlanır.
 */
export async function reissueConfirmationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; confirmationNumber: string }>> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "approve" },
    schema: reissueConfirmationSchema,
    handler: async ({ input, user }) => {
      const db = getDb();
      const previous = await db.zuwendungConfirmation.findUnique({
        where: { id: input.id },
        include: {
          items: { orderBy: { position: "asc" }, select: { sourceId: true } },
          replacedBy: { select: { id: true } },
        },
      });
      if (!previous) throw new ActionError("donations.errors.confirmationNotFound");
      if (previous.status !== "CANCELLED") throw new ActionError("donations.errors.replaceNotCancelled");
      if (previous.replacedBy.length > 0) throw new ActionError("donations.errors.alreadyReplaced");

      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      try {
        if (previous.content === "MEMBERSHIP_FEE") {
          return await issueMembershipFeeConfirmation(actor, {
            memberId: previous.memberId ?? "",
            year: previous.periodFrom.getUTCFullYear(),
            replacesId: previous.id,
          });
        }
        if (previous.kind === "SINGLE") {
          return await issueSingleDonationConfirmation(actor, previous.items[0]?.sourceId ?? "", previous.id);
        }
        return await issueCollectiveDonationConfirmation(actor, {
          donorId: previous.donorId ?? "",
          periodFrom: previous.periodFrom,
          periodTo: previous.periodTo,
          donationIds: previous.items.map((item) => item.sourceId),
          replacesId: previous.id,
        });
      } catch (error) {
        throw toActionError(error);
      }
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; confirmationNumber: string }>>;
}
