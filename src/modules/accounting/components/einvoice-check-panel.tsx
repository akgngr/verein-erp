"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Spinner, StatusChip } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { validateWithKositAction } from "../actions/invoice-actions";

type Issue = { rule: string; severity: "error" | "warning" };
type Kosit = {
  valid: boolean;
  messages: { code: string; level: string; text: string }[];
};

/** Fatura ekranında e-fatura kontrolü: yerel kurallar + isteğe bağlı KoSIT. */
export function EInvoiceCheckPanel({
  invoiceId,
  issues,
  kositEnabled,
}: {
  invoiceId: string;
  issues: Issue[];
  kositEnabled: boolean;
}) {
  const t = useTranslations("accounting.einvoice");
  const translate = useTranslateMessage();
  const [kosit, setKosit] = useState<Kosit | null>(null);
  const [pending, start] = useTransition();
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="size-4 text-ink-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          {t("check.title")}
        </h2>
      </div>
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-success-600">
          <CheckCircle2 className="size-4" />
          {t("check.ok")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {errors.length ? (
            <p className="text-sm font-medium text-danger">
              {t("check.errors", { count: errors.length })}
            </p>
          ) : null}
          {warnings.length ? (
            <p className="text-sm text-warning-600">
              {t("check.warnings", { count: warnings.length })}
            </p>
          ) : null}
          <ul className="flex flex-col gap-1 text-sm">
            {issues.map((issue) => (
              <li key={issue.rule} className="flex items-start gap-2">
                <StatusChip tone={issue.severity === "error" ? "danger" : "warning"}
                >
                  {<TriangleAlert className="size-3" />}
                  {issue.rule}
                </StatusChip>
                <span className="text-ink-700">
                  {t(`rules.${issue.rule}` as never)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {kositEnabled ? (
          <Button
            size="sm"
            className="self-start"
            onPress={() =>
              start(async () => {
                const response = await validateWithKositAction({
                  id: invoiceId,
                });
                if (!response.ok)
                  return void notify.error(translate(response.error));
                setKosit(response.data);
              })
            }
            variant={actionVariant("default", "flat")}
            isPending={pending}
          >
            {pending ? <Spinner size="sm" tone="current" /> : null}
            {t("check.kositRun")}
          </Button>
        ) : (
          <p className="text-xs text-ink-500">{t("check.kositHint")}</p>
        )}
        {kosit ? (
          <div className="flex flex-col gap-1">
            <StatusChip tone={kosit.valid ? "success" : "danger"}
            >
              {kosit.valid ? t("check.kositValid") : t("check.kositInvalid")}
            </StatusChip>
            {kosit.messages.length ? (
              <details className="text-xs">
                <summary className="cursor-pointer">
                  {t("check.kositMessages")} ({kosit.messages.length})
                </summary>
                <ul className="mt-1 list-disc ps-5">
                  {kosit.messages.map((message, index) => (
                    <li key={index}>
                      <span className="font-mono">{message.code}</span>{" "}
                      {message.level ? `[${message.level}] ` : ""}
                      {message.text}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
