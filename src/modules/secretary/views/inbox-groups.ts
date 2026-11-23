import type { ProposalView } from "../services/proposals";

/** The mail provider creates drafts only; approving here never sends a message. */
export function groupSecretaryProposals(proposals: readonly ProposalView[]) {
  const mailDrafts: ProposalView[] = [];
  const other: ProposalView[] = [];
  for (const proposal of proposals) {
    if (proposal.moduleKey === "mail" && (proposal.actionKey === "replyDraft" || proposal.actionKey === "taskDraft")) mailDrafts.push(proposal);
    else other.push(proposal);
  }
  return { mailDrafts, other };
}
