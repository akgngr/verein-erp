"use client";

import { addToast, Button } from "@heroui/react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { decideApprovalAction } from "../actions/workflow-actions";

export type ApprovalRow = { stepId: string; workflowName: string; label: string; note: string; createdAt: string };

export function ApprovalsPanel({ approvals, canDecide }: { approvals: ApprovalRow[]; canDecide: boolean }) {
  const t = useTranslations("automation.approvals");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (approvals.length === 0) return null;

  const decide = (stepId: string, approved: boolean) => startTransition(async () => {
    const response = await decideApprovalAction({ stepId, approved });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: approved ? t("approved") : t("rejected"), color: "success" });
    router.refresh();
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-medium font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-2">
        {approvals.map((approval) => (
          <li key={approval.stepId} className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-warning-200 bg-warning-50 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{approval.workflowName} · {approval.label}</p>
              {approval.note ? <p className="text-small text-default-600">{approval.note}</p> : null}
              <p className="text-tiny text-default-500">{approval.createdAt}</p>
            </div>
            {canDecide ? (
              <div className="flex gap-2">
                <Button size="sm" color="success" isLoading={pending} startContent={<Check className="h-4 w-4" />} onPress={() => decide(approval.stepId, true)}>{t("approve")}</Button>
                <Button size="sm" color="danger" variant="flat" isLoading={pending} startContent={<X className="h-4 w-4" />} onPress={() => decide(approval.stepId, false)}>{t("reject")}</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
