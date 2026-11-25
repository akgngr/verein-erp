"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError, requirePermission, UnauthorizedError } from "@/modules/auth/server";
import { translateMessage } from "@/shared/i18n/translate-message";
import type { ActionResult } from "@/shared/types/action";

import { membersPermissions } from "../permissions";
import { reviewMemberCorrectionProposalAction as reviewProposal } from "../services/portal-self-service";

export async function reviewMemberCorrectionAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: "APPROVED" | "REJECTED" }>> {
  try {
    await requirePermission(membersPermissions, "update");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: await translateMessage("common.errors.sessionExpired") };
    }
    if (error instanceof ForbiddenError) {
      return { ok: false, error: await translateMessage("common.errors.forbidden") };
    }
    throw error;
  }
  const result = await reviewProposal(input);
  if (result.ok) {
    revalidatePath("/uyeler");
  }
  return result;
}
