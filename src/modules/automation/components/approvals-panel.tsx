"use client";
import { toast, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

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
      if (!response.ok)
        return void toast(response.error, { variant: "danger" });
      toast(approved ? t("approved") : t("rejected"), { variant: "success" });
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-2">
        {approvals.map((approval) => (
          <li
            key={approval.stepId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4"
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
                <Button
                  size="sm"
                  onPress={() => decide(approval.stepId, true)}
                  variant={actionVariant("success", "solid")}
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" color="current" /> : null}
                  {<Check className="h-4 w-4" />}
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  onPress={() => decide(approval.stepId, false)}
                  variant={actionVariant("danger", "flat")}
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" color="current" /> : null}
                  {<X className="h-4 w-4" />}
                  {t("reject")}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
