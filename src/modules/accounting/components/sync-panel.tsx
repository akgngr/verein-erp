"use client";
import { toast, Card, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { MemberSyncPreview } from "../types";
import { runMemberSyncAction } from "../actions/sync-actions";

/**
 * Üyelik aktarımı paneli (§ 11.7): ayar kartı ayrı (settings-actions ile);
 * burada önizleme + "Aktar" (accounting.create). Çakışmalar listelenir.
 */
export function SyncPanel({
  preview,
  canRun,
}: {
  preview: MemberSyncPreview & { configured: boolean };
  canRun: boolean;
}) {
  const t = useTranslations("accounting.sync");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  const run = async () => {
    setBusy(true);
    try {
      const result = await runMemberSyncAction();
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      const data = result.data;
      toast(
        t("toastRun", {
          created: data.createdCount,
          reversed: data.reversedCount,
        }),
        { variant: "success" },
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
        {!preview.configured ? (
          <p className="text-sm text-warning">{t("notConfigured")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">
                  {t("toImport")}
                </p>
                <p className="text-sm">
                  {t("count", { count: preview.toImport.count })} —{" "}
                  {t("total", { total: format(preview.toImport.totalCents) })}
                </p>
              </div>
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">
                  {t("toReverse")}
                </p>
                <p className="text-sm">
                  {t("count", { count: preview.toReverse.count })} —{" "}
                  {t("total", { total: format(preview.toReverse.totalCents) })}
                </p>
              </div>
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">
                  {t("toCorrect")}
                </p>
                <p className="text-sm">
                  {t("count", { count: preview.toCorrect.count })} —{" "}
                  {t("total", { total: format(preview.toCorrect.totalCents) })}
                </p>
              </div>
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">
                  {t("skippedLocked")}
                </p>
                <p className="text-sm">{preview.skippedLockedYear}</p>
              </div>
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">
                  {t("skippedOpening")}
                </p>
                <p className="text-sm">{preview.skippedBeforeOpening}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">
                {t("conflicts")}
              </p>
              {preview.conflicts.length === 0 ? (
                <p className="text-sm text-ink-400">{t("noConflict")}</p>
              ) : (
                <ul className="text-sm text-danger">
                  {preview.conflicts.map((conflict) => (
                    <li key={conflict.receiptNumber}>
                      {conflict.receiptNumber} — {conflict.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canRun ? (
              <Button
                className="self-start"
                onPress={run}
                isDisabled={
                  !preview.configured ||
                  (preview.toImport.count === 0 &&
                    preview.toReverse.count === 0 &&
                    preview.toCorrect.count === 0)
                }
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null}
                {t("run")}
              </Button>
            ) : null}
          </>
        )}
      </Card.Content>
    </Card>
  );
}
