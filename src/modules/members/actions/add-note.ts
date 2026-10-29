"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { membersPermissions } from "../permissions";
import { addNoteSchema } from "../schemas/note";

/** Üyeye işlem notu ekleme (timeline kalıbı, documents ile aynı). */
export async function addMemberNoteAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: membersPermissions, action: "update" },
    schema: addNoteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const member = await db.member.findFirst({
        where: { id: input.memberId, deletedAt: null },
        select: { id: true, membershipNumber: true },
      });
      if (!member) throw new ActionError("members.errors.memberNotFound");

      const created = await db.memberNote.create({
        data: {
          memberId: member.id,
          body: input.body,
          authorId: user.id,
          authorLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: "UPDATE",
        entity: "Member",
        entityId: member.id,
        before: { membershipNumber: member.membershipNumber, noteCount: "n/a" },
        after: { membershipNumber: member.membershipNumber, noteAdded: input.body.slice(0, 80) },
      });

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
