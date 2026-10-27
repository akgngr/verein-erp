"use client";

import { Button, Card, CardBody, addToast } from "@heroui/react";
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
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const run = async () => {
    setBusy(true);
    try {
      const result = await runMemberSyncAction();
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      const data = result.data;
      addToast({
        title: t("toastRun", { created: data.createdCount, reversed: data.reversedCount }),
        color: "success",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-4 p-6">
        {!preview.configured ? (
          <p className="text-small text-warning">{t("notConfigured")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-medium border border-default-200 p-3">
                <p className="text-tiny uppercase tracking-wide text-default-400">{t("toImport")}</p>
                <p className="text-small">
                  {t("count", { count: preview.toImport.count })} — {t("total", { total: format(preview.toImport.totalCents) })}
                </p>
              </div>
              <div className="rounded-medium border border-default-200 p-3">
                <p className="text-tiny uppercase tracking-wide text-default-400">{t("toReverse")}</p>
                <p className="text-small">
                  {t("count", { count: preview.toReverse.count })} — {t("total", { total: format(preview.toReverse.totalCents) })}
                </p>
              </div>
              <div className="rounded-medium border border-default-200 p-3">
                <p className="text-tiny uppercase tracking-wide text-default-400">{t("skippedLocked")}</p>
                <p className="text-small">{preview.skippedLockedYear}</p>
              </div>
              <div className="rounded-medium border border-default-200 p-3">
                <p className="text-tiny uppercase tracking-wide text-default-400">{t("skippedOpening")}</p>
                <p className="text-small">{preview.skippedBeforeOpening}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-tiny uppercase tracking-wide text-default-400">{t("conflicts")}</p>
              {preview.conflicts.length === 0 ? (
                <p className="text-small text-default-400">{t("noConflict")}</p>
              ) : (
                <ul className="text-small text-danger">
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
                color="primary"
                className="self-start"
                onPress={run}
                isLoading={busy}
                isDisabled={!preview.configured || (preview.toImport.count === 0 && preview.toReverse.count === 0)}
              >
                {t("run")}
              </Button>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
