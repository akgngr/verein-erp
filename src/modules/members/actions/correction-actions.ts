"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/shared/types/action";

import { reviewMemberCorrectionProposalAction as reviewProposal } from "../services/portal-self-service";

export async function reviewMemberCorrectionAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: "APPROVED" | "REJECTED" }>> {
  const result = await reviewProposal(input);
  if (result.ok) {
    revalidatePath("/uyeler");
  }
  return result;
}
