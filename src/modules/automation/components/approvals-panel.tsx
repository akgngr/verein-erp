"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";

import { decideApprovalAction } from "../actions/workflow-actions";

export type ApprovalRow = {
  stepId: string;
  workflowName: string;
  label: string;
  note: string;
  createdAt: string;
};

export function ApprovalsPanel({
  approvals,
  canDecide,
}: {
  approvals: ApprovalRow[];
  canDecide: boolean;
}) {
  const t = useTranslations("automation.approvals");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (approvals.length === 0) return null;

  const decide = (stepId: string, approved: boolean) =>
    startTransition(async () => {
      const response = await decideApprovalAction({ stepId, approved });
      if (!response.ok) {
        notify(response.error, "danger");
        return;
      }
      notify(approved ? t("approved") : t("rejected"), "success");
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-2">
        {approvals.map((approval) => (
          <li
            key={approval.stepId}
            className="erp-motion-interactive flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {approval.workflowName} · {approval.label}
              </p>
              {approval.note ? (
                <p className="text-sm text-ink-600">{approval.note}</p>
              ) : null}
              <p className="text-xs text-ink-500">{approval.createdAt}</p>
            </div>
            {canDecide ? (
              <div className="flex gap-2">
                <ActionButton
                  color="success"
                  isPending={pending}
                  startIcon={<Check className="h-4 w-4" />}
                  onPress={() => decide(approval.stepId, true)}
                >
                  {t("approve")}
                </ActionButton>
                <ActionButton
                  color="danger"
                  variant="flat"
                  isPending={pending}
                  startIcon={<X className="h-4 w-4" />}
                  onPress={() => decide(approval.stepId, false)}
                >
                  {t("reject")}
                </ActionButton>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
