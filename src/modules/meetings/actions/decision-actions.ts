"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import { decisionAddSchema, decisionDeleteSchema, decisionUpdateSchema } from "../schemas/decision";
import { allocateDecisionNumber, runWithNumberRetry } from "../services/meeting-number";
import { assertMeetingEditable } from "../services/meeting-guards";
import { berlinYear } from "../utils";

/**
 * Karar işlemleri (5. bölüm md. 2, 9): numara <yıl>/<sıra> yıl bazında ortak
 * sayaçtan üretilir; silinen kararın numarası serbest kalmaz (boşluk kabul).
 * Bağlı gündem maddesi aynı toplantıya ait olmak zorundadır.
 */

export async function addDecisionAction(
  input: unknown,
): Promise<ActionResult<{ id: string; decisionNumber: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: decisionAddSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await db.meeting.findFirst({
        where: { id: input.meetingId, deletedAt: null },
        select: {
          id: true,
          meetingNumber: true,
          status: true,
          deletedAt: true,
          meetingDate: true,
        },
      });
      if (!meeting) throw new ActionError("Toplantı bulunamadı.");
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);

      // KARAR: gündem bağlantısı aynı toplantıya ait olmalıdır (5. bölüm md. 9).
      if (input.agendaItemId) {
        const agendaItem = await db.agendaItem.findFirst({
          where: { id: input.agendaItemId, meetingId: meeting.id },
          select: { id: true },
        });
        if (!agendaItem) {
          throw new ActionError("Gündem maddesi bulunamadı.", {
            agendaItemId: ["Geçerli bir gündem maddesi seçin."],
          });
        }
      }

      const year = berlinYear(meeting.meetingDate);

      const created = await runWithNumberRetry(() =>
        db.$transaction(async (tx) => {
          const { sequence, decisionNumber } = await allocateDecisionNumber(tx, year);
          return tx.meetingDecision.create({
            data: {
              meetingId: meeting.id,
              agendaItemId: input.agendaItemId,
              year,
              sequence,
              decisionNumber,
              text: input.text,
              result: input.result,
              votesFor: input.votesFor,
              votesAgainst: input.votesAgainst,
              votesAbstain: input.votesAbstain,
            },
          });
        }),
      );

      await audit({
        action: "DECISION_ADD",
        entity: "MeetingDecision",
        entityId: created.id,
        after: {
          meetingNumber: meeting.meetingNumber,
          decisionNumber: created.decisionNumber,
          result: created.result,
        },
      });

      return { id: created.id, decisionNumber: created.decisionNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; decisionNumber: string }>>;
}

export async function updateDecisionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: decisionUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const decision = await db.meetingDecision.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          agendaItemId: true,
          meeting: {
            select: { id: true, meetingNumber: true, status: true, deletedAt: true },
          },
        },
      });
      if (!decision) throw new ActionError("Karar bulunamadı.");
      assertMeetingEditable(decision.meeting, "content", user.role, meetingsPermissions);

      if (input.agendaItemId && input.agendaItemId !== decision.agendaItemId) {
        const agendaItem = await db.agendaItem.findFirst({
          where: { id: input.agendaItemId, meetingId: decision.meeting.id },
          select: { id: true },
        });
        if (!agendaItem) {
          throw new ActionError("Gündem maddesi bulunamadı.", {
            agendaItemId: ["Geçerli bir gündem maddesi seçin."],
          });
        }
      }

      await db.meetingDecision.update({
        where: { id: decision.id },
        data: {
          agendaItemId: input.agendaItemId,
          text: input.text,
          result: input.result,
          votesFor: input.votesFor,
          votesAgainst: input.votesAgainst,
          votesAbstain: input.votesAbstain,
        },
      });

      await audit({
        action: "DECISION_UPDATE",
        entity: "MeetingDecision",
        entityId: decision.id,
        after: { meetingNumber: decision.meeting.meetingNumber, result: input.result },
      });

      return { id: decision.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function deleteDecisionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: decisionDeleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const decision = await db.meetingDecision.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          decisionNumber: true,
          meeting: { select: { meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!decision) throw new ActionError("Karar bulunamadı.");
      assertMeetingEditable(decision.meeting, "content", user.role, meetingsPermissions);

      await db.meetingDecision.delete({ where: { id: decision.id } });

      // KARAR: numara serbest kalmaz; boşluk kabul edilir (5. bölüm md. 2).
      await audit({
        action: "DECISION_DELETE",
        entity: "MeetingDecision",
        entityId: decision.id,
        before: {
          meetingNumber: decision.meeting.meetingNumber,
          decisionNumber: decision.decisionNumber,
        },
      });

      return { id: decision.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
