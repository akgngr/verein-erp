import { getTranslations } from "next-intl/server";

import { Card } from "@/shared/components/kit";
import type { Role } from "@/shared/roles";
import { SecretaryProposalActions } from "../components/proposal-actions";
import { getPendingProposals } from "../services/pending-proposals";

/** Only sanitized previews from server service are ever sent to the client. */
export async function SecretaryInboxView({ user }: { user: { id: string; role: Role } }) {
  const t = await getTranslations("secretary");
  let proposals: Awaited<ReturnType<typeof getPendingProposals>> = [];
  let unavailable = false;
  try {
    proposals = await getPendingProposals(user);
  } catch {
    unavailable = true;
    console.error("[secretary] PROPOSAL_INBOX_FAILED");
  }

  const labels = {
    approve: t("ui.proposalApprove"),
    reject: t("ui.proposalReject"),
    external: t("ui.proposalExternal"),
    externalExplanation: t("ui.proposalExternalExplanation"),
    confirm: t("ui.proposalConfirm"),
    cancel: t("ui.proposalCancel"),
    expires: t("ui.proposalExpires"),
    expired: t("ui.proposalExpired"),
    done: t("ui.proposalDone"),
    error: t("ui.proposalError"),
    snooze: t("ui.proposalSnooze"),
    edit: t("ui.proposalEdit"),
  };

  return (
    <Card className="border border-ink-200/80 bg-surface shadow-sm">
      <Card.Header><h2 className="text-base font-semibold">{t("ui.proposalInbox")}</h2></Card.Header>
      <Card.Content>
        {unavailable ? <p role="status" className="text-sm text-ink-500">{t("ui.proposalUnavailable")}</p> :
          proposals.length === 0 ? <p className="text-sm text-ink-500">{t("ui.proposalEmpty")}</p> :
          <ul className="divide-y divide-ink-200/70">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold break-words">{proposal.title}</p>
                {proposal.detail ? <p className="text-sm break-words text-ink-500">{proposal.detail}</p> : null}
                <p className="text-xs text-ink-500">
                  {proposal.moduleKey} · {proposal.actionKey} · {labels.expires}: <time dateTime={proposal.expiresAt}>{proposal.expiresAt.slice(0, 10)}</time>
                </p>
                <SecretaryProposalActions proposal={proposal} labels={labels} />
              </li>
            ))}
          </ul>}
      </Card.Content>
    </Card>
  );
}
