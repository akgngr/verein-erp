"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import { changeStatusSchema } from "../schemas/change-status";
import { assertTransitionAllowed } from "../services/meeting-guards";

/**
 * Durum değişikliği (5. bölüm md. 3): geçiş haritası meeting-guards'ta
 * denetlenir. Onaylama koşulu: en az 1 gündem maddesi ve en az 1 PRESENT
 * katılımcı; yeter sayısı sağlanmamışsa onay YİNE DE kabul edilir (UI uyarı
 * penceresi gösterir; sunucu zorunlu tutmaz — 5. bölüm md. 3).
 * Yeniden açma (APPROVED → HELD) zorunlu gerekçe ister; gerekçe audit'e yazılır.
 */
export async function changeMeetingStatusAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: changeStatusSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const meeting = await db.meeting.findFirst({
        where: { id: input.meetingId, deletedAt: null },
        select: {
          id: true,
          meetingNumber: true,
          status: true,
          quorumRequired: true,
          _count: { select: { agendaItems: true, attendees: { where: { attendance: "PRESENT" } } } },
        },
      });
      if (!meeting) {
        throw new ActionError("meetings.errors.meetingNotFound");
      }

      const required = assertTransitionAllowed(
        meeting.status,
        input.status,
        user.role,
        meetingsPermissions,
      );

      if (input.status === "APPROVED") {
        if (meeting._count.agendaItems < 1) {
          throw new ActionError(
            "Onaylamak için en az bir gündem maddesi gereklidir.",
          );
        }
        if (meeting._count.attendees < 1) {
          throw new ActionError(
            "Onaylamak için en az bir katılımcının 'Katıldı' olarak işaretlenmesi gereklidir.",
          );
        }
      }

      // KARAR: yeniden açma şeması gereği reason zorunlu; transition map'i zaten
      // yalnızca APPROVED → HELD'e izin verir, burada ikisini birleştiriyoruz.
      const isReopen = meeting.status === "APPROVED" && input.status === "HELD";
      if (isReopen && !input.reason) {
        throw new ActionError("meetings.errors.reopenReasonRequired", {
          reason: ["meetings.errors.reopenReasonRequired"],
        });
      }

      const userLabel = buildUserLabel(user.name, user.email);

      await db.$transaction(async (tx) => {
        await tx.meeting.update({
          where: { id: meeting.id },
          data:
            input.status === "APPROVED"
              ? {
                  status: "APPROVED",
                  approvedAt: new Date(),
                  approvedById: user.id,
                  approvedByLabel: userLabel,
                  updatedById: user.id,
                  updatedByLabel: userLabel,
                }
              : {
                  status: input.status,
                  // Yeniden açma onay bilgilerini temizler (5. bölüm md. 3).
                  approvedAt: null,
                  approvedById: null,
                  approvedByLabel: null,
                  updatedById: user.id,
                  updatedByLabel: userLabel,
                },
        });
      });

      await audit({
        action: isReopen ? "REOPEN" : input.status === "APPROVED" ? "APPROVE" : "STATUS_CHANGE",
        entity: "Meeting",
        entityId: meeting.id,
        before: { meetingNumber: meeting.meetingNumber, status: meeting.status },
        after: {
          meetingNumber: meeting.meetingNumber,
          status: input.status,
          // KARAR: reopen gerekçesi audit kaydında saklanır (5. bölüm md. 3).
          ...(isReopen ? { reason: input.reason } : {}),
        },
      });

      void required;
      return { id: meeting.id, status: input.status };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; status: string }>>;
}
