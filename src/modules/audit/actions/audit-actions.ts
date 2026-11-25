"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { auditPermissions } from "../permissions";
import { getAuditLogChanges } from "../queries/list-audit-logs";

/** #583: Denetim kaydının önce/sonra ayrıntısı (yalnız `audit.view`). Parola alanları yazımda zaten ayıklanır. */
export async function getAuditLogChangesAction(input: unknown): Promise<ActionResult<{ before: unknown; after: unknown }>> {
  return createAction({
    permission: { definition: auditPermissions, action: "view" },
    schema: z.object({ id: z.string().min(1).max(64) }),
    handler: async ({ input }) => {
      const changes = await getAuditLogChanges(input.id);
      if (!changes) throw new ActionError("audit.errors.notFound");
      return changes;
    },
  })(input);
}
