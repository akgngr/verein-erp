"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

import { Button, Input, Label, StatusChip, TextField } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";
import { notify } from "@/shared/components/ui/notify";

import { reviewMemberCorrectionAction } from "../actions/correction-actions";

export type PendingCorrectionProposalRow = {
  id: string;
  field: string;
  previousValue: string | null;
  proposedValue: string;
  createdAt: string;
  member: {
    id: string;
    membershipNumber: string;
    firstName: string;
    lastName: string;
  };
};

export function CorrectionProposalsPanel({
  proposals,
}: {
  proposals: PendingCorrectionProposalRow[];
}) {
  const t = useTranslations("members.corrections");
  const tForm = useTranslations("members.form");
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (proposals.length === 0) return null;

  const fieldLabel = (field: string): string => {
    switch (field) {
      case "email":
      case "phone":
      case "street":
      case "houseNumber":
      case "postalCode":
      case "city":
        return tForm(field);
      default:
        return field;
    }
  };

  const review = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setBusyId(id);
    const result = await reviewMemberCorrectionAction({
      id,
      decision,
      note: notes[id] || undefined,
    });
    setBusyId(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(decision === "APPROVED" ? t("approved") : t("rejected"));
    router.refresh();
  };

  return (
    <section
      aria-label={t("title")}
      className="mb-4 rounded-lg border border-warning-200 bg-warning-50/40 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-ink-600">{t("description")}</p>
        </div>
        <StatusChip tone="warning">{t("pendingCount", { count: proposals.length })}</StatusChip>
      </div>

      <ul className="flex flex-col divide-y divide-ink-200 rounded-md border border-ink-200 bg-surface">
        {proposals.map((item) => {
          const isBusy = busyId === item.id;
          return (
            <li
              key={item.id}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-500">
                    {item.member.membershipNumber}
                  </span>
                  <span className="font-medium text-foreground">
                    {item.member.firstName} {item.member.lastName}
                  </span>
                  <StatusChip tone="default">{fieldLabel(item.field)}</StatusChip>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-600">
                  <span className="line-through">{item.previousValue || t("emptyValue")}</span>
                  <span aria-hidden>→</span>
                  <span className="font-semibold text-foreground">{item.proposedValue}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <TextField
                  id={`correction-note-${item.id}`}
                  value={notes[item.id] ?? ""}
                  onChange={(value) => setNotes((prev) => ({ ...prev, [item.id]: value }))}
                  className="w-48"
                >
                  <Label className="sr-only">{t("noteLabel")}</Label>
                  <Input placeholder={t("notePlaceholder")} />
                </TextField>
                <Button
                  size="sm"
                  variant={actionVariant("success", "solid")}
                  isPending={isBusy}
                  isDisabled={busyId !== null}
                  onPress={() => review(item.id, "APPROVED")}
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  variant={actionVariant("danger", "light")}
                  isPending={isBusy}
                  isDisabled={busyId !== null}
                  onPress={() => review(item.id, "REJECTED")}
                >
                  <X className="h-4 w-4" aria-hidden />
                  {t("reject")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
