"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { membersPermissions } from "../permissions";
import { changeStatusSchema } from "../schemas/member";
import { parseDateOnly } from "../utils";

/**
 * Üye durum değiştirme (ACTIVE/PASSIVE/RESIGNED/DECEASED).
 * RESIGNED/DECEASED durumuna geçişte exitDate zorunludur; exitDate verilmezse
 * önceki exitDate korunur (yoksa hata). ACTIVE/PASSIVE'e geri dönüş exitDate'i
 * temizlemez (geçmişe iz bırakır; sadece status değişir).
 */
export async function changeMemberStatusAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: membersPermissions, action: "update" },
    schema: changeStatusSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const member = await db.member.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!member) throw new ActionError("members.errors.memberNotFound");

      const newStatus = input.status;
      let exitDate = member.exitDate;
      // Faz 4 (4.6): fesih bildirimi tarihi — RESIGNED'e geçişte opsiyonel girilir;
      // ACTIVE/PASSIVE'e dönüşte temizlenir (spec: "cleared when the member returns").
      let cancellationReceivedAt = member.cancellationReceivedAt;

      if (input.exitDate) {
        const parsed = parseDateOnly(input.exitDate);
        if (!parsed) {
          throw new ActionError("members.errors.exitDateInvalid", {
            exitDate: ["members.validation.exitDateInvalid"],
          });
        }
        if (parsed.getTime() < member.joinDate.getTime()) {
          throw new ActionError("members.errors.datesInvalid", { exitDate: ["members.validation.exitBeforeJoin"] });
        }
        exitDate = parsed;
      }

      if (input.cancellationReceivedAt !== undefined) {
        if (input.cancellationReceivedAt === null) {
          cancellationReceivedAt = null;
        } else {
          const parsed = parseDateOnly(input.cancellationReceivedAt);
          if (!parsed) {
            throw new ActionError("members.errors.noticeDateInvalid", {
              cancellationReceivedAt: ["members.validation.noticeDateInvalid"],
            });
          }
          if (exitDate && parsed.getTime() > exitDate.getTime()) {
            throw new ActionError("members.errors.noticeAfterExit", {
              cancellationReceivedAt: ["members.validation.noticeAfterExit"],
            });
          }
          cancellationReceivedAt = parsed;
        }
      }

      if (newStatus === "RESIGNED" || newStatus === "DECEASED") {
        if (!exitDate) {
          throw new ActionError("members.errors.exitDateRequired", { exitDate: ["members.validation.exitDateRequired"] });
        }
      }

      const updatedByLabel = buildUserLabel(user.name, user.email);

      const updated = await db.member.update({
        where: { id: member.id },
        data: {
          status: newStatus,
          exitDate,
          exitReason: input.exitReason ?? member.exitReason,
          // ACTIVE/PASSIVE'e dönüşte fesih bildirimi temizlenir (4.6); RESIGNED/
          // DECEASED'te girilen değer korunur.
          cancellationReceivedAt:
            newStatus === "ACTIVE" || newStatus === "PASSIVE"
              ? null
              : cancellationReceivedAt,
          updatedById: user.id,
          updatedByLabel,
        },
      });

      await audit({
        action: "UPDATE",
        entity: "Member",
        entityId: updated.id,
        before: {
          membershipNumber: member.membershipNumber,
          status: member.status,
          exitDate: member.exitDate ? member.exitDate.toISOString().slice(0, 10) : null,
          exitReason: member.exitReason,
          cancellationReceivedAt: member.cancellationReceivedAt
            ? member.cancellationReceivedAt.toISOString().slice(0, 10)
            : null,
        },
        after: {
          membershipNumber: member.membershipNumber,
          status: updated.status,
          exitDate: updated.exitDate ? updated.exitDate.toISOString().slice(0, 10) : null,
          exitReason: updated.exitReason,
          cancellationReceivedAt: updated.cancellationReceivedAt
            ? updated.cancellationReceivedAt.toISOString().slice(0, 10)
            : null,
        },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
