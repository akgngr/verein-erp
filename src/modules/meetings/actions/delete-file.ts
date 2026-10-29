"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import { assertMeetingEditable } from "../services/meeting-guards";

const DELETE_FILE_SCHEMA = z.object({ fileId: z.string().min(1) });

/**
 * Toplantı eki silme (5. bölüm md. 4): toplantı APPROVED ise yalnızca delete
 * yetkisi (ADMIN); diğer durumlarda update yetkisi yeterlidir. Silme yumuşaktır
 * (deletedAt); diskteki dosya KORUNUR (Faz 1 yaklaşımıyla aynı).
 */
export async function deleteMeetingFileAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: DELETE_FILE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const file = await db.meetingFile.findFirst({
        where: { id: input.fileId, deletedAt: null },
        select: {
          id: true,
          originalName: true,
          meeting: { select: { id: true, meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!file) throw new ActionError("meetings.errors.fileNotFound");

      // KARAR: fileDelete kapsamı rolü de dikkate alır (APPROVED → yalnızca ADMIN).
      assertMeetingEditable(file.meeting, "fileDelete", user.role, meetingsPermissions);

      await db.meetingFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });

      await audit({
        action: "FILE_DELETE",
        entity: "MeetingFile",
        entityId: file.id,
        before: {
          meetingNumber: file.meeting.meetingNumber,
          fileName: file.originalName,
        },
      });

      return { id: file.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
