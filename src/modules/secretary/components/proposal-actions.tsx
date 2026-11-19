"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Button, Dialog } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import type { ProposalView } from "../services/proposals";
import { confirmProposalAction, dismissProposalAction, snoozeProposalAction } from "../actions/proposals";
import { isProposalExpired, requiresExternalConfirmation } from "./proposal-policy";

export type ProposalActionLabels = {
  approve: string;
  reject: string;
  external: string;
  externalExplanation: string;
  confirm: string;
  cancel: string;
  expires: string;
  expired: string;
  done: string;
  error: string;
  snooze: string;
  edit: string;
};

export function SecretaryProposalActions({ proposal, labels }: { proposal: ProposalView; labels: ProposalActionLabels }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [resolved, setResolved] = useState(false);
  // Server additionally validates expiration, permissions and stale snapshots.
  const expired = isProposalExpired(proposal.expiresAt, new Date());

  async function execute(action: "approve" | "reject" | "snooze", confirmExternal = false) {
    if (pending || resolved || expired) return;
    setPending(true);
    try {
      const result = action === "approve"
        ? await confirmProposalAction({ id: proposal.id, confirmExternal })
        : action === "snooze"
          ? await snoozeProposalAction({ id: proposal.id, until: new Date(Date.now() + 86_400_000).toISOString() })
          : await dismissProposalAction({ id: proposal.id });
      if (!result.ok) { notify.error(result.error || labels.error); router.refresh(); return; }
      setResolved(true);
      setConfirming(false);
      notify.success(labels.done);
      router.refresh();
    } catch {
      notify.error(labels.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2" aria-busy={pending}>
      {expired ? <p className="text-sm text-danger" role="status">{labels.expired}</p> : null}
      {resolved ? <p className="text-sm text-ink-500" role="status">{labels.done}</p> : null}
      {!expired && !resolved ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" isDisabled={pending} onPress={() =>
            requiresExternalConfirmation(proposal.risk) ? setConfirming(true) : void execute("approve")
          }>{labels.approve}</Button>
          <Button variant="secondary" size="sm" isDisabled={pending} onPress={() => void execute("reject")}>{labels.reject}</Button>
          <Button variant="secondary" size="sm" isDisabled={pending} onPress={() => void execute("snooze")}>{labels.snooze}</Button>
          {proposal.editHref ? <Link href={proposal.editHref} className="inline-flex items-center rounded-md px-2 py-1 text-sm underline">{labels.edit}</Link> : null}
        </div>
      ) : null}
      <Dialog isOpen={confirming} onOpenChange={setConfirming} isDismissable={!pending} size="sm" aria-label={labels.external}>
        <Dialog.Header><Dialog.Heading>{labels.external}</Dialog.Heading></Dialog.Header>
        <Dialog.Body><p className="text-sm">{labels.externalExplanation}</p></Dialog.Body>
        <Dialog.Footer>
          <Button variant="secondary" isDisabled={pending} onPress={() => setConfirming(false)}>{labels.cancel}</Button>
          <Button variant="danger" isDisabled={pending} isPending={pending} onPress={() => void execute("approve", true)}>{labels.confirm}</Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  );
}
